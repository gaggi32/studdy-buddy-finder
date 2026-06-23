const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const { readDb, writeDb } = require('../utils/fileDb');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  // Never leak passwordHash to the client.
  const { passwordHash, ...rest } = user;
  return rest;
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, isAdmin: !!user.isAdmin },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// US-01: User Registration
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const db = await readDb();
    const normalizedEmail = email.toLowerCase().trim();

    if (db.users.some((u) => u.email === normalizedEmail)) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date().toISOString(),
      status: 'active',
      pausedUntil: null,
      profile: null,
      subjects: [],
      learningGoals: [],
      availability: []
    };

    db.users.push(newUser);
    await writeDb(db);

    const token = signToken(newUser);
    return res.status(201).json({ token, user: publicUser(newUser) });
  } catch (err) {
    return next(err);
  }
});

// US-02: User Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = await readDb();
    const user = db.users.find((u) => u.email === email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);
    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
});

// US-15: Request password reset link
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'E-Mail-Adresse ist erforderlich' });
    }

    const db = await readDb();
    const user = db.users.find((u) => u.email === email.toLowerCase().trim());

    if (!user) {
      return res.status(404).json({ error: 'Kein Benutzer mit dieser E-Mail-Adresse gefunden' });
    }

    const token = uuidv4();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    user.resetToken = token;
    user.resetExpires = expires;

    await writeDb(db);

    const resetLink = `http://localhost:5173/reset-password?token=${token}`;
    console.log(`[Email Mock] Password reset link for ${user.email}: ${resetLink}`);

    return res.json({
      success: true,
      message: 'Ein Reset-Link wurde generiert.',
      resetLink,
      token
    });
  } catch (err) {
    return next(err);
  }
});

// US-15: Reset password using token
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: 'Token und neues Passwort sind erforderlich' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Das Passwort muss mindestens 8 Zeichen lang sein' });
    }

    const db = await readDb();
    const user = db.users.find((u) => u.resetToken === token);

    if (!user) {
      return res.status(400).json({ error: 'Der Reset-Link ist ungültig oder abgelaufen' });
    }

    const expires = new Date(user.resetExpires);
    if (Number.isNaN(expires.getTime()) || expires.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'Der Reset-Link ist abgelaufen (24 Stunden Gültigkeit)' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    user.passwordHash = passwordHash;
    user.resetToken = null;
    user.resetExpires = null;

    await writeDb(db);

    return res.json({ success: true, message: 'Ihr Passwort wurde erfolgreich zurückgesetzt.' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
