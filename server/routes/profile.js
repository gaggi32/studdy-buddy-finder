const express = require('express');
const { readDb, updateUser } = require('../utils/fileDb');
const { requireAuth, requireSelf } = require('../middleware/auth');

const router = express.Router();

const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const VALID_LEVELS = ['beginner', 'intermediate', 'advanced'];
const VALID_ROLES = ['seeking', 'offering'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

// GET current user's full record
router.get('/:userId', requireAuth, requireSelf, async (req, res, next) => {
  try {
    const db = await readDb();
    const user = db.users.find((u) => u.id === req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
});

// US-03: Create / update basic profile
router.put('/:userId/profile', requireAuth, requireSelf, async (req, res, next) => {
  try {
    const { firstName, lastName, university, studyProgram, semester, bio } = req.body || {};

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'firstName and lastName are required' });
    }
    if (semester != null && (!Number.isInteger(semester) || semester < 1 || semester > 30)) {
      return res.status(400).json({ error: 'semester must be an integer between 1 and 30' });
    }

    const profile = {
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      university: university ? String(university).trim() : '',
      studyProgram: studyProgram ? String(studyProgram).trim() : '',
      semester: semester ?? null,
      bio: bio ? String(bio).trim() : '',
      updatedAt: new Date().toISOString()
    };

    const updated = await updateUser(req.params.userId, (u) => ({ ...u, profile }));
    return res.json({ user: publicUser(updated) });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

// US-04: Subjects + Learning Goals
router.put('/:userId/subjects', requireAuth, requireSelf, async (req, res, next) => {
  try {
    const { subjects, learningGoals } = req.body || {};

    if (!Array.isArray(subjects)) {
      return res.status(400).json({ error: 'subjects must be an array' });
    }
    if (learningGoals != null && !Array.isArray(learningGoals)) {
      return res.status(400).json({ error: 'learningGoals must be an array of strings' });
    }

    const cleanedSubjects = [];
    for (const s of subjects) {
      if (!s || !s.name) {
        return res.status(400).json({ error: 'Each subject must have a name' });
      }
      const level = (s.level || 'beginner').toLowerCase();
      if (!VALID_LEVELS.includes(level)) {
        return res.status(400).json({
          error: `subject level must be one of: ${VALID_LEVELS.join(', ')}`
        });
      }
      const role = (s.role || 'seeking').toLowerCase();
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({
          error: `subject role must be one of: ${VALID_ROLES.join(', ')}`
        });
      }
      cleanedSubjects.push({
        name: String(s.name).trim(),
        level,
        role,
        goal: s.goal ? String(s.goal).trim() : ''
      });
    }

    const cleanedGoals = (learningGoals || [])
      .filter((g) => typeof g === 'string' && g.trim())
      .map((g) => g.trim());

    const updated = await updateUser(req.params.userId, (u) => ({
      ...u,
      subjects: cleanedSubjects,
      learningGoals: cleanedGoals
    }));

    return res.json({ user: publicUser(updated) });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

// US-05: Available study times
router.put('/:userId/availability', requireAuth, requireSelf, async (req, res, next) => {
  try {
    const { availability } = req.body || {};
    if (!Array.isArray(availability)) {
      return res.status(400).json({ error: 'availability must be an array of slots' });
    }

    const cleaned = [];
    for (const slot of availability) {
      if (!slot || !VALID_DAYS.includes(slot.day)) {
        return res.status(400).json({
          error: `Each slot needs a valid day (${VALID_DAYS.join(', ')})`
        });
      }
      if (!TIME_RE.test(slot.startTime) || !TIME_RE.test(slot.endTime)) {
        return res.status(400).json({ error: 'startTime/endTime must be HH:MM (24h)' });
      }
      if (slot.startTime >= slot.endTime) {
        return res.status(400).json({ error: 'startTime must be earlier than endTime' });
      }
      cleaned.push({
        day: slot.day,
        startTime: slot.startTime,
        endTime: slot.endTime
      });
    }

    const updated = await updateUser(req.params.userId, (u) => ({
      ...u,
      availability: cleaned
    }));

    return res.json({ user: publicUser(updated) });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

// US-10: Activate / deactivate the account. Deactivated profiles are hidden
// from everyone's matching list (US-06) but the owner can still log in.
router.put('/:userId/account', requireAuth, requireSelf, async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (status !== 'active' && status !== 'deactivated') {
      return res.status(400).json({ error: "status must be 'active' or 'deactivated'" });
    }
    const updated = await updateUser(req.params.userId, (u) => ({ ...u, status }));
    return res.json({ user: publicUser(updated) });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

// US-06: Block another user — they disappear from each other's suggestions.
router.post('/:userId/block', requireAuth, requireSelf, async (req, res, next) => {
  try {
    const { targetId } = req.body || {};
    if (!targetId || targetId === req.params.userId) {
      return res.status(400).json({ error: 'A valid targetId is required' });
    }
    const updated = await updateUser(req.params.userId, (u) => {
      const blocked = new Set(u.blockedUserIds || []);
      blocked.add(targetId);
      return { ...u, blockedUserIds: [...blocked] };
    });
    return res.json({ user: publicUser(updated) });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

// Undo a block.
router.delete('/:userId/block/:targetId', requireAuth, requireSelf, async (req, res, next) => {
  try {
    const updated = await updateUser(req.params.userId, (u) => ({
      ...u,
      blockedUserIds: (u.blockedUserIds || []).filter((id) => id !== req.params.targetId)
    }));
    return res.json({ user: publicUser(updated) });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return next(err);
  }
});

module.exports = router;
