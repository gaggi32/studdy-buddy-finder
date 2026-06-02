const express = require('express');

const { readDb } = require('../utils/fileDb');
const { requireAuth } = require('../middleware/auth');
const {
  isActive,
  isBlockedBetween,
  commonSubjects,
  commonGoals,
  overlappingSlots,
  displayName
} = require('../utils/matching');
const { connectionBetween } = require('../utils/connections');

const router = express.Router();

// Map a raw connection record into the status the requesting user perceives.
function connectionStatusFor(connection, meId) {
  if (!connection) return 'none';
  if (connection.status === 'accepted') return 'accepted';
  if (connection.status === 'declined') return 'declined';
  // pending
  return connection.requesterId === meId ? 'pending_outgoing' : 'pending_incoming';
}

// US-06: Suggested study partners for the current user.
// US-07: returns all data (subjects, roles, availability) so the client can
// filter instantly; clients may also pass ?subject=&role=&day= as a convenience.
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const db = await readDb();
    const me = db.users.find((u) => u.id === req.user.id);
    if (!me) return res.status(404).json({ error: 'User not found' });

    const hasOwnAvailability = (me.availability || []).length > 0;

    const matches = [];
    for (const other of db.users) {
      if (other.id === me.id) continue;
      if (!other.profile) continue;          // skip users without a profile
      if (!isActive(other)) continue;        // hide deactivated profiles (US-06)
      if (isBlockedBetween(me, other)) continue; // hide blocked profiles (US-06)

      const subjects = commonSubjects(me, other);
      const goals = commonGoals(me, other);
      if (subjects.length === 0 && goals.length === 0) continue; // need ≥1 in common

      // Only show partners I'm actually available with. If I haven't entered any
      // availability there's nothing to match against, so don't exclude anyone.
      const sharedSlots = overlappingSlots(me, other);
      if (hasOwnAvailability && sharedSlots.length === 0) continue;

      const connection = connectionBetween(db, me.id, other.id);
      const status = connectionStatusFor(connection, me.id);
      const revealFull = status === 'accepted';

      matches.push({
        userId: other.id,
        name: displayName(other, revealFull),
        anonymized: !revealFull,
        university: other.profile.university || '',
        commonSubjects: subjects,
        commonGoals: goals,
        sharedAvailability: sharedSlots,
        // Distinct days the partner is available, for the "Lernzeit" filter.
        availableDays: [...new Set((other.availability || []).map((s) => s.day))],
        connectionId: connection ? connection.id : null,
        connectionStatus: status
      });
    }

    // Most subjects/goals in common first — the strongest matches on top.
    matches.sort(
      (a, b) =>
        b.commonSubjects.length + b.commonGoals.length -
        (a.commonSubjects.length + a.commonGoals.length)
    );

    return res.json({ matches });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
