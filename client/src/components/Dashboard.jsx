import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { profileApi } from '../api.js';

const LEVEL_CLASS = {
  beginner: 'level-beginner',
  intermediate: 'level-intermediate',
  advanced: 'level-advanced'
};

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
        <button className="btn btn-ghost" onClick={() => navigate('/onboarding')}>
          Edit profile
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
