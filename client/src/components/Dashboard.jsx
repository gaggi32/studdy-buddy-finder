import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { profileApi, connectionApi } from '../api.js';
import Toast from './Toast.jsx';

const LEVEL_CLASS = {
  beginner: 'level-beginner',
  intermediate: 'level-intermediate',
  advanced: 'level-advanced'
};

const ROLE_LABEL = { seeking: 'Looking for help', offering: 'Offering help' };
const ROLE_CLASS = { seeking: 'role-seeking', offering: 'role-offering' };

// US-11/US-12: the effective visibility state derived from the user record.
function accountState(user) {
  if (user.status === 'locked') return 'locked';
  if (user.status === 'deactivated') return 'deactivated';
  
  const now = Date.now();
  if (user.pausedFrom && user.pausedUntil) {
    const from = new Date(user.pausedFrom).getTime();
    const until = new Date(user.pausedUntil).getTime();
    if (!Number.isNaN(from) && !Number.isNaN(until) && now >= from && now <= until) {
      return 'paused';
    }
  } else if (user.pausedUntil && new Date(user.pausedUntil).getTime() > now) {
    return 'paused';
  }
  return 'active';
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
}

// Account visibility controls: one-click deactivate/reactivate (US-11), a
// timed pause that auto-reactivates (US-12), and lock display (US-14).
function AccountStatus({ user, setUser }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  
  // Date inputs for custom pause
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [pauseStart, setPauseStart] = useState(todayStr);
  const [pauseEnd, setPauseEnd] = useState(tomorrowStr);

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

  async function handleContactAdmin() {
    setBusy(true);
    setError('');
    try {
      const conn = await connectionApi.contactAdmin();
      navigate(`/messages/${conn.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const META = {
    active: { dot: 'ok', title: 'Profil aktiv', sub: "Sie sind für andere Studenten sichtbar und können Match-Anfragen erhalten." },
    paused: {
      dot: 'warn',
      title: 'Profil pausiert',
      sub: `Unsichtbar in Matches bis ${user.pausedUntil ? formatDate(user.pausedUntil) : ''}. Das Profil reaktiviert sich danach automatisch.`
    },
    deactivated: { dot: 'off', title: 'Profil deaktiviert', sub: "Sie sind ausgeblendet. Klicken Sie auf Reaktivieren, um wieder online zu gehen." },
    locked: { dot: 'off', title: 'Profil gesperrt', sub: "Ihr Profil wurde gesperrt. Matches sind deaktiviert und Sie können keine neuen Nachrichten senden." }
  }[state];

  // Check if there is a future pause scheduled (now is before pauseStart)
  const hasFuturePause = !busy && state === 'active' && user.pausedFrom && user.pausedUntil && new Date(user.pausedFrom).getTime() > Date.now();

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

      <div className="account-status-actions" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
        {state === 'active' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
            {/* Pause Inputs */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              background: 'var(--surface2)',
              padding: '14px 18px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              width: '100%',
              maxWidth: '460px'
            }}>
              <strong style={{ fontSize: '0.85rem' }}>Profil pausieren (Start- & Enddatum)</strong>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: '120px' }}>
                  <label className="field-label" style={{ fontSize: '0.7rem' }}>Startdatum</label>
                  <input
                    type="date"
                    value={pauseStart}
                    min={todayStr}
                    onChange={(e) => setPauseStart(e.target.value)}
                    disabled={busy}
                    style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: '120px' }}>
                  <label className="field-label" style={{ fontSize: '0.7rem' }}>Enddatum</label>
                  <input
                    type="date"
                    value={pauseEnd}
                    min={pauseStart || todayStr}
                    onChange={(e) => setPauseEnd(e.target.value)}
                    disabled={busy}
                    style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                disabled={busy || !pauseStart || !pauseEnd}
                onClick={() => run(
                  () => profileApi.pauseProfile(user.id, null, pauseStart, pauseEnd),
                  'Pause erfolgreich eingerichtet.'
                )}
                style={{ marginTop: 8, width: 'max-content' }}
              >
                ⏸ Pause aktivieren
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-danger-ghost btn-sm"
                disabled={busy}
                onClick={() => run(
                  () => profileApi.setAccountStatus(user.id, 'deactivated'),
                  'Profil erfolgreich deaktiviert.'
                )}
              >
                Deaktivieren
              </button>
            </div>
          </div>
        )}

        {hasFuturePause && (
          <div style={{
            marginTop: 12,
            padding: '12px 16px',
            background: 'var(--accent-dim)',
            borderRadius: 'var(--radius)',
            border: '1px solid #6366f130',
            width: '100%',
            maxWidth: '460px'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-h)' }}>Geplante Pause:</div>
            <div className="muted" style={{ fontSize: '0.8rem', marginTop: 2 }}>
              Von {formatDate(user.pausedFrom)} bis {formatDate(user.pausedUntil)}
            </div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 8, padding: '4px 10px', fontSize: '0.75rem' }}
              disabled={busy}
              onClick={() => run(() => profileApi.resumeProfile(user.id), 'Geplante Pause storniert.')}
            >
              Pause stornieren
            </button>
          </div>
        )}

        {state === 'paused' && (
          <button
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() => run(() => profileApi.resumeProfile(user.id), 'Welcome back — Profil aktiv')}
          >
            ▶ Pause beenden (Jetzt reaktivieren)
          </button>
        )}

        {state === 'deactivated' && (
          <button
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={() => run(() => profileApi.setAccountStatus(user.id, 'active'), 'Profil reaktiviert.')}
          >
            ▶ Jetzt reaktivieren
          </button>
        )}

        {state === 'locked' && (
          <button
            className="btn btn-danger btn-sm"
            disabled={busy}
            onClick={handleContactAdmin}
          >
            💬 Support kontaktieren
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
  const isLocked = user.status === 'locked';

  return (
    <div className="page-wrap">

      {/* Hero */}
      <div className="dashboard-hero">
        <div>
          <h1>{firstName ? `Hey, ${firstName} 👋` : 'Welcome 👋'}</h1>
          <p className="muted">Hier ist Ihr StudyBuddy-Profil im Überblick.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/profile/edit')}>
          Profil bearbeiten
        </button>
      </div>

      {/* Account status */}
      <AccountStatus user={user} setUser={setUser} />

      {/* Locked Alert Card */}
      {isLocked && (
        <div className="card" style={{ borderLeft: '4px solid var(--danger)', background: 'var(--danger-bg)', padding: '20px 24px' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚠️ Konto gesperrt</span>
          </h2>
          <p className="muted" style={{ color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: 12 }}>
            Ihr Profil wurde aufgrund von Richtlinienverstößen gesperrt. Matches sind deaktiviert und Sie können keine neuen Nachrichten an andere Benutzer senden. Sie können sich jedoch weiterhin mit dem Administrator austauschen.
          </p>
          <button className="btn btn-danger" onClick={async () => {
            try {
              const conn = await connectionApi.contactAdmin();
              navigate(`/messages/${conn.id}`);
            } catch (err) {
              alert(err.message);
            }
          }}>
            Administrator kontaktieren
          </button>
        </div>
      )}

      {/* Quick actions - blocked if locked */}
      {!isLocked && (
        <div className="quick-actions">
          <button className="quick-action" onClick={() => navigate('/matches')}>
            <span className="quick-action-icon">🔍</span>
            <span>
              <span className="quick-action-title">Lernpartner finden</span>
              <span className="quick-action-sub">Profile ansehen, die zu Ihren Fächern passen</span>
            </span>
          </button>
          <button className="quick-action" onClick={() => navigate('/messages')}>
            <span className="quick-action-icon">💬</span>
            <span>
              <span className="quick-action-title">Nachrichten</span>
              <span className="quick-action-sub">Ihre Kontakte und Chats einsehen</span>
            </span>
          </button>
        </div>
      )}

      {/* Basic profile */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><span className="card-title-icon">👤</span> Steckbrief</span>
        </div>
        {p ? (
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Name</div>
              <div className="info-value">{p.firstName} {p.lastName}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Universität</div>
              <div className="info-value">{p.university || <span style={{ color: 'var(--text-dim)' }}>—</span>}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Studiengang</div>
              <div className="info-value">{p.studyProgram || <span style={{ color: 'var(--text-dim)' }}>—</span>}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Semester</div>
              <div className="info-value">{p.semester ?? <span style={{ color: 'var(--text-dim)' }}>—</span>}</div>
            </div>
            {p.bio && (
              <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                <div className="info-label">Über mich</div>
                <div className="info-value">{p.bio}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            Noch kein Steckbrief angelegt.{' '}
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/onboarding')}>
              Jetzt einrichten
            </button>
          </div>
        )}
      </div>

      {/* Subjects */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><span className="card-title-icon">📖</span> Fächer</span>
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
          <div className="empty-state">Keine Fächer eingetragen.</div>
        )}
      </div>

      {/* Learning goals */}
      {user.learningGoals?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon">🎯</span> Lernziele</span>
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
          <span className="card-title"><span className="card-title-icon">🗓</span> Lernzeiten</span>
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
          <div className="empty-state">Keine Zeiten eingetragen.</div>
        )}
      </div>

    </div>
  );
}
