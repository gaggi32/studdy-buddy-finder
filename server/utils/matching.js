// Shared helpers for partner matching (US-06/07) and contact privacy (US-08/09).

const VALID_ROLES = ['seeking', 'offering'];

// US-12: A profile is "paused" while its pausedUntil timestamp is still in the
// future. The pause simply expires at read time, so the account reactivates
// automatically once the date passes — no scheduled job required.
function isPaused(user) {
  const now = Date.now();
  if (user.pausedFrom && user.pausedUntil) {
    const from = new Date(user.pausedFrom).getTime();
    const until = new Date(user.pausedUntil).getTime();
    if (!Number.isNaN(from) && !Number.isNaN(until)) {
      return now >= from && now <= until;
    }
  }
  if (user.pausedUntil) {
    const until = new Date(user.pausedUntil).getTime();
    return !Number.isNaN(until) && until > now;
  }
  return false;
}

// A profile is visible in matching only when the account is active: not manually
// deactivated (US-11), not locked (US-14), and not currently paused (US-12).
function isActive(user) {
  return user.status !== 'deactivated' && user.status !== 'locked' && !isPaused(user);
}

// True when either user has blocked the other (blocking is symmetric for the
// purpose of hiding suggestions — US-06).
function isBlockedBetween(a, b) {
  const aBlocked = Array.isArray(a.blockedUserIds) && a.blockedUserIds.includes(b.id);
  const bBlocked = Array.isArray(b.blockedUserIds) && b.blockedUserIds.includes(a.id);
  return aBlocked || bBlocked;
}

function normName(name) {
  return String(name || '').trim().toLowerCase();
}

// Subjects shared between two users, keyed by the *other* user's role so the UI
// can show "sucht Hilfe / bietet Hilfe" per subject (US-06).
function commonSubjects(me, other) {
  const mine = new Set((me.subjects || []).map((s) => normName(s.name)).filter(Boolean));
  const result = [];
  for (const s of other.subjects || []) {
    if (mine.has(normName(s.name))) {
      result.push({
        name: s.name,
        level: s.level,
        role: VALID_ROLES.includes(s.role) ? s.role : 'seeking'
      });
    }
  }
  return result;
}

// Learning goals shared between two users (case-insensitive).
function commonGoals(me, other) {
  const mine = new Set((me.learningGoals || []).map(normName).filter(Boolean));
  return (other.learningGoals || []).filter((g) => mine.has(normName(g)));
}

// Two availability slots overlap when they fall on the same day and their time
// ranges intersect. Times are zero-padded "HH:MM" so string compare is safe.
function slotsOverlap(a, b) {
  return a.day === b.day && a.startTime < b.endTime && b.startTime < a.endTime;
}

// The set of my availability slots that overlap at least one of the other
// user's slots. Used both to filter ("nur Verfügbare") and to show the matching
// times in the UI.
function overlappingSlots(me, other) {
  const mineSlots = me.availability || [];
  const otherSlots = other.availability || [];
  return mineSlots.filter((mineSlot) =>
    otherSlots.some((otherSlot) => slotsOverlap(mineSlot, otherSlot))
  );
}

// Anonymized contact name until mutual confirmation: first name + last initial,
// e.g. "Kevin K." Full name is only revealed once a connection is accepted.
function displayName(user, revealFull) {
  const p = user.profile || {};
  const first = (p.firstName || '').trim();
  const last = (p.lastName || '').trim();
  if (revealFull) {
    return [first, last].filter(Boolean).join(' ') || 'Student';
  }
  if (!first && !last) return 'Anonymous Student';
  const initial = last ? `${last[0].toUpperCase()}.` : '';
  return [first || 'Student', initial].filter(Boolean).join(' ');
}

module.exports = {
  VALID_ROLES,
  isActive,
  isPaused,
  isBlockedBetween,
  commonSubjects,
  commonGoals,
  slotsOverlap,
  overlappingSlots,
  displayName
};
