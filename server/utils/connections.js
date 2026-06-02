// Connection record helpers (US-08/09). A "connection" represents the contact
// between two students: it starts as `pending` when one sends the first message
// and becomes `accepted` once the recipient confirms (mutual confirmation),
// which unlocks the private chat and reveals full names.

const { v4: uuidv4 } = require('uuid');

const STATUSES = ['pending', 'accepted', 'declined'];

// Find an existing connection between two users regardless of direction.
function connectionBetween(db, userIdA, userIdB) {
  return db.connections.find(
    (c) =>
      (c.requesterId === userIdA && c.recipientId === userIdB) ||
      (c.requesterId === userIdB && c.recipientId === userIdA)
  );
}

function isParticipant(connection, userId) {
  return connection.requesterId === userId || connection.recipientId === userId;
}

function otherParticipantId(connection, userId) {
  return connection.requesterId === userId ? connection.recipientId : connection.requesterId;
}

function newConnection({ requesterId, recipientId }) {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    requesterId,
    recipientId,
    status: 'pending',
    createdAt: now,
    updatedAt: now
  };
}

function newMessage({ connectionId, senderId, body }) {
  return {
    id: uuidv4(),
    connectionId,
    senderId,
    body,
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  STATUSES,
  connectionBetween,
  isParticipant,
  otherParticipantId,
  newConnection,
  newMessage
};
