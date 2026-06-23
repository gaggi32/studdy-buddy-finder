import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { profileApi } from '../api.js';
import Toast from './Toast.jsx';

const LEVEL_CLASS = {
  beginner: 'level-beginner',
  intermediate: 'level-intermediate',
  advanced: 'level-advanced'
};

const ROLE_LABEL = { seeking: 'Looking for help', offering: 'Offering help' };
const ROLE_CLASS = { seeking: 'role-seeking', offering: 'role-offering' };

const PAUSE_OPTIONS = [
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 30, label: '1 month' }
];

// US-11/US-12: the effective visibility state derived from the user record.
function accountState(user) {
  if (user.status === 'deactivated') return 'deactivated';
  if (user.pausedUntil && new Date(user.pausedUntil).getTime() > Date.now()) return 'paused';
  return 'active';
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
}

// Account visibility controls: one-click deactivate/reactivate (US-11) and a
// timed pause that auto-reactivates (US-12).
function AccountStatus({ user, setUser }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pauseDays, setPauseDays] = useState(7);
  const [toast, setToast] = useState('');

  const state = accountState(user);

  async function run(action, successMsg) {
    setBusy(true);
    setError('');
    try {
      const updated = await action();
      setUser(updated);
      setToast(successMsg);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const META = {
    active: { dot: 'ok', title: 'Profile active', sub: "You're visible to other students and can receive requests." },
    paused: {
      dot: 'warn',
      title: 'Profile paused',
      sub: `Hidden from matches until ${user.pausedUntil ? formatDate(user.pausedUntil) : ''}. It reactivates automatically.`
    },
    deactivated: { dot: 'off', title: 'Profile deactivated', sub: "You're hidden from everyone's matches until you reactivate." }
  }[state];

  return (
    <div className="card account-status">
      <Toast message={toast} onDone={() => setToast('')} />
      <div className="account-status-head">
        <span className={`status-dot status-dot-${META.dot}`} />
        <div>
          <div className="account-status-title">{META.title}</div>
          <div className="muted" style={{ fontSize: '.82rem' }}>{META.sub}</div>
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginTop: 12 }}>⚠ {error}</div>}

      <div className="account-status-actions">
        {state === 'active' && (
          <>
            <div className="pause-control">
              <select
                value={pauseDays}
                disabled={busy}
                onChange={(e) => setPauseDays(Number(e.target.value))}
              >
                {PAUSE_OPTIONS.map((o) => (
                  <option key={o.days} value={o.days}>{o.label}</option>
                ))}
              </select>
              <button
                className="btn btn-ghost btn-sm"
                disabled={busy}
                onClick={() => run(
                  () => profileApi.pauseProfile(user.id, pauseDays),
                  'Profile paused'
                )}
              >
                ⏸ Pause
              </button>
            </div>
            <button
              className="btn btn-danger-ghost btn-sm"
              disabled={busy}
              onClick={() => run(
                () => profileApi.setAccountStatus(user.id, 'deactivated'),
                'Profile deactivated'
              )}
            >
              Deactivate
            </button>
          </>
        )}

        {state === 'paused' && (
          <button
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() => run(() => profileApi.resumeProfile(user.id), 'Welcome back — profile active')}
          >
            ▶ Resume now
          </button>
        )}

        {state === 'deactivated' && (
          <button
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() => run(() => profileApi.setAccountStatus(user.id, 'active'), 'Profile reactivated')}
          >
            ▶ Reactivate
          </button>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    profileApi
      .get(user.id)
      .then((fresh) => { if (!cancelled) setUser(fresh); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  if (error) {
    return (
      <div className="page-wrap">
        <div className="error-banner">⚠ {error}</div>
      </div>
    );
  }

  const p = user.profile;
  const firstName = p?.firstName ?? '';

  return (
    <div className="page-wrap">

      {/* Hero */}
      <div className="dashboard-hero">
        <div>
          <h1>{firstName ? `Hey, ${firstName} 👋` : 'Welcome 👋'}</h1>
          <p className="muted">Here's your study profile at a glance.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/profile/edit')}>
          Edit profile
        </button>
      </div>

      {/* US-11 / US-12: account visibility status & controls */}
      <AccountStatus user={user} setUser={setUser} />

      {/* Quick actions */}
      <div className="quick-actions">
        <button className="quick-action" onClick={() => navigate('/matches')}>
          <span className="quick-action-icon">🔍</span>
          <span>
            <span className="quick-action-title">Find study partners</span>
            <span className="quick-action-sub">See students who match your subjects & times</span>
          </span>
        </button>
        <button className="quick-action" onClick={() => navigate('/messages')}>
          <span className="quick-action-icon">💬</span>
          <span>
            <span className="quick-action-title">Messages</span>
            <span className="quick-action-sub">Requests and your private chats</span>
          </span>
        </button>
      </div>

      {/* Basic profile */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><span className="card-title-icon">👤</span> Profile</span>
        </div>
        {p ? (
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Full name</div>
              <div className="info-value">{p.firstName} {p.lastName}</div>
            </div>
            <div className="info-item">
              <div className="info-label">University</div>
              <div className="info-value">{p.university || <span style={{ color: 'var(--text-dim)' }}>—</span>}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Study program</div>
              <div className="info-value">{p.studyProgram || <span style={{ color: 'var(--text-dim)' }}>—</span>}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Semester</div>
              <div className="info-value">{p.semester ?? <span style={{ color: 'var(--text-dim)' }}>—</span>}</div>
            </div>
            {p.bio && (
              <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                <div className="info-label">Bio</div>
                <div className="info-value">{p.bio}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            No profile yet.{' '}
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/onboarding')}>
              Complete setup
            </button>
          </div>
        )}
      </div>

      {/* Subjects */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><span className="card-title-icon">📖</span> Subjects</span>
        </div>
        {user.subjects?.length ? (
          <div className="subject-list">
            {user.subjects.map((s, i) => (
              <div className="subject-item" key={i}>
                <span className="subject-name">{s.name}</span>
                <span className="subject-goal">{s.goal || ''}</span>
                {s.role && (
                  <span className={`role-badge ${ROLE_CLASS[s.role] ?? ''}`}>{ROLE_LABEL[s.role]}</span>
                )}
                <span className={`level-badge ${LEVEL_CLASS[s.level] ?? ''}`}>{s.level}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No subjects added yet.</div>
        )}
      </div>

      {/* Learning goals */}
      {user.learningGoals?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon">🎯</span> Learning goals</span>
          </div>
          <div className="chip-list">
            {user.learningGoals.map((g, i) => (
              <span className="chip chip-accent" key={i}>{g}</span>
            ))}
          </div>
        </div>
      )}

      {/* Availability */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><span className="card-title-icon">🗓</span> Availability</span>
        </div>
        {user.availability?.length ? (
          <div className="schedule-grid">
            {user.availability.map((slot, i) => (
              <div className="schedule-slot" key={i}>
                <span className="schedule-day">{slot.day}</span>
                <span className="schedule-time">{slot.startTime} – {slot.endTime}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No time slots added yet.</div>
        )}
      </div>

    </div>
  );
}
