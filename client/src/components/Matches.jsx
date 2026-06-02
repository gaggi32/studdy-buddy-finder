import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { matchApi, connectionApi, profileApi } from '../api.js';
import Toast from './Toast.jsx';

const ROLE_LABEL = { seeking: 'Looking for help', offering: 'Offering help' };
const ROLE_CLASS = { seeking: 'role-seeking', offering: 'role-offering' };
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const EMPTY_FILTERS = { subject: '', role: '', day: '' };

export default function Matches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [composeFor, setComposeFor] = useState(null); // match being messaged
  const [toast, setToast] = useState('');

  useEffect(() => {
    let cancelled = false;
    matchApi
      .list()
      .then((data) => { if (!cancelled) setMatches(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Build the filter option lists from the data the server returned (US-07).
  const subjectOptions = useMemo(() => {
    const set = new Set();
    matches.forEach((m) => m.commonSubjects.forEach((s) => set.add(s.name)));
    return [...set].sort();
  }, [matches]);

  const dayOptions = useMemo(() => {
    const set = new Set();
    matches.forEach((m) => m.availableDays.forEach((d) => set.add(d)));
    return DAY_ORDER.filter((d) => set.has(d));
  }, [matches]);

  // Apply the active filters instantly (US-07).
  const visible = useMemo(() => {
    return matches.filter((m) => {
      if (filters.subject && !m.commonSubjects.some((s) => s.name === filters.subject)) {
        return false;
      }
      if (filters.role && !m.commonSubjects.some((s) => s.role === filters.role)) {
        return false;
      }
      if (filters.day && !m.availableDays.includes(filters.day)) {
        return false;
      }
      return true;
    });
  }, [matches, filters]);

  const activeFilters = Object.entries(filters).filter(([, v]) => v);

  function clearFilter(key) {
    setFilters((f) => ({ ...f, [key]: '' }));
  }

  function filterLabel(key, value) {
    if (key === 'role') return ROLE_LABEL[value];
    return value;
  }

  async function handleSent(match, connection) {
    // Reflect the new pending state on the card without a full refetch.
    setMatches((prev) =>
      prev.map((m) =>
        m.userId === match.userId
          ? { ...m, connectionStatus: 'pending_outgoing', connectionId: connection.id }
          : m
      )
    );
    setComposeFor(null);
    setToast('Message sent ✓');
  }

  async function handleBlock(match) {
    if (!window.confirm(`Block ${match.name}? They will no longer appear in your matches.`)) {
      return;
    }
    try {
      await profileApi.blockUser(user.id, match.userId);
      setMatches((prev) => prev.filter((m) => m.userId !== match.userId));
      setToast('User blocked');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <div className="page-wrap"><div className="empty-state">Finding study partners…</div></div>;
  }

  return (
    <div className="page-wrap">
      <Toast message={toast} onDone={() => setToast('')} />

      <div className="dashboard-hero">
        <div>
          <h1>Find a study partner</h1>
          <p className="muted">
            Students who share at least one subject or goal and are free when you are.
          </p>
        </div>
        <Link to="/messages"><button className="btn btn-ghost">💬 Messages</button></Link>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      {/* US-07: Filter bar */}
      <div className="card filter-bar">
        <div className="filter-controls">
          <div className="field">
            <label className="field-label">Subject</label>
            <select
              value={filters.subject}
              onChange={(e) => setFilters((f) => ({ ...f, subject: e.target.value }))}
            >
              <option value="">All subjects</option>
              {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Role</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
            >
              <option value="">Any role</option>
              <option value="seeking">Looking for help</option>
              <option value="offering">Offering help</option>
            </select>
          </div>
          <div className="field">
            <label className="field-label">Available on</label>
            <select
              value={filters.day}
              onChange={(e) => setFilters((f) => ({ ...f, day: e.target.value }))}
            >
              <option value="">Any day</option>
              {dayOptions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Active filters, each removable (US-07) */}
        {activeFilters.length > 0 && (
          <div className="active-filters">
            <span className="muted" style={{ fontSize: '.8rem' }}>Active:</span>
            {activeFilters.map(([key, value]) => (
              <span className="chip chip-accent" key={key}>
                {filterLabel(key, value)}
                <button className="chip-remove" type="button" onClick={() => clearFilter(key)}>✕</button>
              </span>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear all
            </button>
          </div>
        )}
      </div>

      <p className="muted" style={{ margin: '4px 2px 14px' }}>
        {visible.length} {visible.length === 1 ? 'match' : 'matches'}
      </p>

      {visible.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            {matches.length === 0
              ? 'No matches yet. Add more subjects or study times to your profile to find partners.'
              : 'No matches fit these filters. Try clearing some.'}
          </div>
        </div>
      ) : (
        <div className="match-list">
          {visible.map((m) => (
            <MatchCard
              key={m.userId}
              match={m}
              onMessage={() => setComposeFor(m)}
              onBlock={() => handleBlock(m)}
            />
          ))}
        </div>
      )}

      {composeFor && (
        <ComposeModal
          match={composeFor}
          onClose={() => setComposeFor(null)}
          onSent={handleSent}
        />
      )}
    </div>
  );
}

function MatchCard({ match, onMessage, onBlock }) {
  return (
    <div className="card match-card">
      <div className="match-head">
        <div className="match-avatar">{match.name[0]}</div>
        <div className="match-id">
          <div className="match-name">
            {match.name}
            {match.anonymized && <span className="anon-badge" title="Full name hidden until you connect">anonymous</span>}
          </div>
          {match.university && <div className="muted" style={{ fontSize: '.8rem' }}>{match.university}</div>}
        </div>
      </div>

      <div className="match-section">
        <div className="match-section-label">Shared subjects</div>
        <div className="subject-tag-list">
          {match.commonSubjects.map((s) => (
            <span className="subject-tag" key={s.name}>
              <span className="subject-tag-name">{s.name}</span>
              <span className={`role-badge ${ROLE_CLASS[s.role]}`}>{ROLE_LABEL[s.role]}</span>
            </span>
          ))}
        </div>
      </div>

      {match.commonGoals.length > 0 && (
        <div className="match-section">
          <div className="match-section-label">Shared goals</div>
          <div className="chip-list">
            {match.commonGoals.map((g) => <span className="chip chip-accent" key={g}>{g}</span>)}
          </div>
        </div>
      )}

      {match.sharedAvailability.length > 0 && (
        <div className="match-section">
          <div className="match-section-label">You're both free</div>
          <div className="chip-list">
            {match.sharedAvailability.map((slot, i) => (
              <span className="chip" key={i}>{slot.day} {slot.startTime}–{slot.endTime}</span>
            ))}
          </div>
        </div>
      )}

      <div className="match-actions">
        <MatchAction match={match} onMessage={onMessage} />
        <button className="btn btn-danger-ghost btn-sm" onClick={onBlock}>Block</button>
      </div>
    </div>
  );
}

// The primary action depends on the current connection state with this person.
function MatchAction({ match, onMessage }) {
  switch (match.connectionStatus) {
    case 'accepted':
      return (
        <Link to={`/messages/${match.connectionId}`}>
          <button className="btn btn-primary btn-sm">💬 Open chat</button>
        </Link>
      );
    case 'pending_outgoing':
      return <button className="btn btn-ghost btn-sm" disabled>Request sent</button>;
    case 'pending_incoming':
      return (
        <Link to="/messages">
          <button className="btn btn-primary btn-sm">Respond in inbox</button>
        </Link>
      );
    case 'declined':
      return <button className="btn btn-ghost btn-sm" disabled>Declined</button>;
    default:
      return <button className="btn btn-primary btn-sm" onClick={onMessage}>Send message</button>;
  }
}

// US-08: compose and send the first (anonymized) message.
const MAX_LEN = 500;

function ComposeModal({ match, onClose, onSent }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body) { setError('Please write a short message first.'); return; }
    setBusy(true);
    setError('');
    try {
      const connection = await connectionApi.send(match.userId, body);
      onSent(match, connection);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Message {match.name}</h2>
          <button className="btn-icon" onClick={onClose} title="Close">✕</button>
        </div>
        <p className="muted" style={{ marginBottom: 16 }}>
          Your contact stays anonymous — {match.name.split(' ')[0]} won't see your full name until you both connect.
        </p>

        {error && <div className="error-banner">⚠ {error}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <textarea
              rows="4"
              maxLength={MAX_LEN}
              value={text}
              autoFocus
              placeholder="Hi! I saw we both study… want to team up?"
              onChange={(e) => setText(e.target.value)}
            />
            <div className="char-counter">{text.length}/{MAX_LEN}</div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Sending…' : 'Send message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
