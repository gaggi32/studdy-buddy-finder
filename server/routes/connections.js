const express = require('express');

const { readDb, updateDb } = require('../utils/fileDb');
const { requireAuth } = require('../middleware/auth');
const { isActive, isBlockedBetween, displayName } = require('../utils/matching');
const {
  connectionBetween,
  isParticipant,
  otherParticipantId,
  newConnection,
  newMessage
} = require('../utils/connections');

const router = express.Router();

const MAX_MESSAGE_LEN = 500;

function userById(db, id) {
  return db.users.find((u) => u.id === id);
}

// Shape a connection for the requesting user: partner name is anonymized until
// the connection is accepted (US-08 privacy), plus a preview of the last message.
function serializeConnection(db, connection, meId) {
  const partner = userById(db, otherParticipantId(connection, meId));
  const revealFull = connection.status === 'accepted';
  const msgs = db.messages
    .filter((m) => m.connectionId === connection.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const last = msgs[msgs.length - 1] || null;

  return {
    id: connection.id,
    status: connection.status,
    // 'requester' = I sent the first message; 'recipient' = it landed in my inbox.
    role: connection.requesterId === meId ? 'requester' : 'recipient',
    partnerUserId: partner ? partner.id : null,
    partnerName: partner ? displayName(partner, revealFull) : 'Unknown',
    anonymized: !revealFull,
    messageCount: msgs.length,
    lastMessage: last
      ? { body: last.body, createdAt: last.createdAt, fromMe: last.senderId === meId }
      : null,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt
  };
}

function validateMessageBody(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { error: 'Message cannot be empty' };
  }
  const body = raw.trim();
  if (body.length > MAX_MESSAGE_LEN) {
    return { error: `Message must be at most ${MAX_MESSAGE_LEN} characters` };
  }
  return { body };
}

// US-08: Send a first message to a suggested partner (creates a pending
// connection that shows up in the recipient's inbox).
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { recipientId, message } = req.body || {};
    if (!recipientId) {
      return res.status(400).json({ error: 'recipientId is required' });
    }
    if (recipientId === req.user.id) {
      return res.status(400).json({ error: 'You cannot message yourself' });
    }

    const { body, error } = validateMessageBody(message);
    if (error) return res.status(400).json({ error });

    const result = await updateDb((db) => {
      const me = userById(db, req.user.id);
      const recipient = userById(db, recipientId);
      if (!recipient || !recipient.profile || !isActive(recipient)) {
        return { status: 404, error: 'Recipient not found' };
      }
      if (me.status === 'locked' && !recipient.isAdmin) {
        return { status: 403, error: 'Ihr Profil ist gesperrt. Sie können nur den Administrator kontaktieren.' };
      }
      if (isBlockedBetween(me, recipient)) {
        return { status: 403, error: 'You cannot contact this user' };
      }
      if (connectionBetween(db, me.id, recipient.id)) {
        return { status: 409, error: 'You are already in contact with this user' };
      }

      const connection = newConnection({ requesterId: me.id, recipientId: recipient.id });
      db.connections.push(connection);
      db.messages.push(newMessage({ connectionId: connection.id, senderId: me.id, body }));
      return { connection };
    });

    if (result.error) return res.status(result.status).json({ error: result.error });

    const db = await readDb();
    return res.status(201).json({ connection: serializeConnection(db, result.connection, req.user.id) });
  } catch (err) {
    return next(err);
  }
});

// List my connections (inbox of incoming requests + active chats).
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const db = await readDb();
    const mine = db.connections
      .filter((c) => isParticipant(c, req.user.id))
      .map((c) => serializeConnection(db, c, req.user.id))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return res.json({ connections: mine });
  } catch (err) {
    return next(err);
  }
});

// Load one connection (participants only).
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const db = await readDb();
    const connection = db.connections.find((c) => c.id === req.params.id);
    if (!connection || !isParticipant(connection, req.user.id)) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    return res.json({ connection: serializeConnection(db, connection, req.user.id) });
  } catch (err) {
    return next(err);
  }
});

// Messages of a connection (participants only). Available for pending
// connections too, so the recipient can read the first message in their inbox.
router.get('/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const db = await readDb();
    const connection = db.connections.find((c) => c.id === req.params.id);
    if (!connection || !isParticipant(connection, req.user.id)) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    const messages = db.messages
      .filter((m) => m.connectionId === connection.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt,
        fromMe: m.senderId === req.user.id
      }));
    return res.json({ status: connection.status, messages });
  } catch (err) {
    return next(err);
  }
});

// Accept an incoming request — mutual confirmation, unlocks chat + full name.
router.post('/:id/accept', requireAuth, async (req, res, next) => {
  try {
    const result = await updateDb((db) => {
      const connection = db.connections.find((c) => c.id === req.params.id);
      if (!connection || !isParticipant(connection, req.user.id)) {
        return { status: 404, error: 'Connection not found' };
      }
      if (connection.recipientId !== req.user.id) {
        return { status: 403, error: 'Only the recipient can accept this request' };
      }
      if (connection.status !== 'pending') {
        return { status: 409, error: `Request is already ${connection.status}` };
      }
      connection.status = 'accepted';
      connection.updatedAt = new Date().toISOString();
      return { connection };
    });
    if (result.error) return res.status(result.status).json({ error: result.error });

    const db = await readDb();
    return res.json({ connection: serializeConnection(db, result.connection, req.user.id) });
  } catch (err) {
    return next(err);
  }
});

// Decline an incoming request.
router.post('/:id/decline', requireAuth, async (req, res, next) => {
  try {
    const result = await updateDb((db) => {
      const connection = db.connections.find((c) => c.id === req.params.id);
      if (!connection || !isParticipant(connection, req.user.id)) {
        return { status: 404, error: 'Connection not found' };
      }
      if (connection.recipientId !== req.user.id) {
        return { status: 403, error: 'Only the recipient can decline this request' };
      }
      if (connection.status !== 'pending') {
        return { status: 409, error: `Request is already ${connection.status}` };
      }
      connection.status = 'declined';
      connection.updatedAt = new Date().toISOString();
      return { connection };
    });
    if (result.error) return res.status(result.status).json({ error: result.error });

    const db = await readDb();
    return res.json({ connection: serializeConnection(db, result.connection, req.user.id) });
  } catch (err) {
    return next(err);
  }
});

// US-09: Send a message in the private chat — only after mutual confirmation.
router.post('/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const { body, error } = validateMessageBody((req.body || {}).body);
    if (error) return res.status(400).json({ error });

    const result = await updateDb((db) => {
      const connection = db.connections.find((c) => c.id === req.params.id);
      if (!connection || !isParticipant(connection, req.user.id)) {
        return { status: 404, error: 'Connection not found' };
      }

      const me = userById(db, req.user.id);
      if (me.status === 'locked') {
        const partnerId = otherParticipantId(connection, req.user.id);
        const partner = userById(db, partnerId);
        if (!partner || !partner.isAdmin) {
          return { status: 403, error: 'Ihr Profil ist gesperrt. Sie können nur den Administrator kontaktieren.' };
        }
      }

      if (connection.status !== 'accepted') {
        return { status: 403, error: 'Chat is only available after the request is accepted' };
      }
      const msg = newMessage({ connectionId: connection.id, senderId: req.user.id, body });
      db.messages.push(msg);
      connection.updatedAt = msg.createdAt;
      return { msg };
    });
    if (result.error) return res.status(result.status).json({ error: result.error });

    return res.status(201).json({
      message: {
        id: result.msg.id,
        body: result.msg.body,
        createdAt: result.msg.createdAt,
        fromMe: true
      }
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/connections/contact-admin - Create or fetch a support chat with Admin
router.post('/contact-admin', requireAuth, async (req, res, next) => {
  try {
    const result = await updateDb((db) => {
      const me = userById(db, req.user.id);
      if (!me) return { status: 404, error: 'User not found' };

      // Find the first admin
      const admin = db.users.find((u) => u.isAdmin);
      if (!admin) {
        return { status: 404, error: 'Administrator nicht im System registriert.' };
      }

      // Check if connection already exists
      let conn = connectionBetween(db, me.id, admin.id);
      if (!conn) {
        conn = newConnection({ requesterId: me.id, recipientId: admin.id });
        conn.status = 'accepted'; // support chat accepted immediately
        db.connections.push(conn);

        // System greeting from Admin
        const welcome = newMessage({
          connectionId: conn.id,
          senderId: admin.id,
          body: 'Hallo! Ihr Profil wurde gesperrt. Bitte beschreiben Sie Ihr Anliegen hier, damit wir die Sperre überprüfen können.'
        });
        db.messages.push(welcome);
      }
      return { connection: conn };
    });

    if (result.error) return res.status(result.status).json({ error: result.error });

    const db = await readDb();
    return res.json({ connection: serializeConnection(db, result.connection, req.user.id) });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
