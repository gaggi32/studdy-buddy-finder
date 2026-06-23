import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { profileApi } from '../api.js';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges.js';
import Toast from './Toast.jsx';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const ROLES = [
  { value: 'seeking', label: 'Looking for help' },
  { value: 'offering', label: 'Offering help' }
];
const EMPTY_SUBJECT = { name: '', level: 'beginner', role: 'seeking', goal: '' };
const EMPTY_SLOT = { day: 'Monday', startTime: '18:00', endTime: '20:00' };

// Build the editable state from a user record.
function stateFromUser(u) {
  const p = u.profile || {};
  return {
    firstName: p.firstName || '',
    lastName: p.lastName || '',
    university: p.university || '',
    studyProgram: p.studyProgram || '',
    semester: p.semester ?? '',
    bio: p.bio || '',
    subjects: (u.subjects?.length ? u.subjects : [{ ...EMPTY_SUBJECT }]).map((s) => ({ ...EMPTY_SUBJECT, ...s })),
    goals: u.learningGoals || [],
    availability: u.availability?.length ? u.availability.map((s) => ({ ...s })) : [{ ...EMPTY_SLOT }],
    status: u.status === 'deactivated' ? 'deactivated' : 'active'
  };
}

export default function EditProfile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(() => stateFromUser(user));
  const [baseline, setBaseline] = useState(() => JSON.stringify(stateFromUser(user)));
  const [goalInput, setGoalInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Pull the freshest record on mount so we never edit stale data.
  useEffect(() => {
    let cancelled = false;
    profileApi.get(user.id).then((fresh) => {
      if (cancelled) return;
      const next = stateFromUser(fresh);
      setForm(next);
      setBaseline(JSON.stringify(next));
      setUser(fresh);
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const dirty = useMemo(() => JSON.stringify(form) !== baseline, [form, baseline]);

  // US-10: warn on navigation while there are unsaved changes. Suppressed once a
  // delete is underway so the "discard changes?" prompt can't block the redirect.
  useUnsavedChanges(dirty && !deleting);

  // US-13: after the account is deleted, leave the app and clear the session.
  useEffect(() => {
    if (!deleting) return;
    navigate('/register', { replace: true });
    logout();
  }, [deleting, navigate, logout]);

  async function handleDelete() {
    setError('');
    try {
      await profileApi.deleteAccount(user.id);
      setConfirmDelete(false);
      setDeleting(true); // triggers the redirect + logout effect above
    } catch (err) {
      setError(err.message);
      setConfirmDelete(false);
    }
  }

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // ── Subjects ──
  function updateSubject(idx, patch) {
    setForm((f) => ({
      ...f,
      subjects: f.subjects.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    }));
  }
  function addSubject() {
    setForm((f) => ({ ...f, subjects: [...f.subjects, { ...EMPTY_SUBJECT }] }));
  }
  function removeSubject(idx) {
    setForm((f) => ({ ...f, subjects: f.subjects.filter((_, i) => i !== idx) }));
  }

  // ── Goals ──
  function addGoal() {
    const v = goalInput.trim();
    if (!v) return;
    setForm((f) => ({ ...f, goals: [...f.goals, v] }));
    setGoalInput('');
  }
  function removeGoal(idx) {
    setForm((f) => ({ ...f, goals: f.goals.filter((_, i) => i !== idx) }));
  }

  // ── Availability ──
  function updateSlot(idx, patch) {
    setForm((f) => ({
      ...f,
      availability: f.availability.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    }));
  }
  function addSlot() {
    setForm((f) => ({ ...f, availability: [...f.availability, { ...EMPTY_SLOT }] }));
  }
  function removeSlot(idx) {
    setForm((f) => ({ ...f, availability: f.availability.filter((_, i) => i !== idx) }));
  }

  async function save(e) {
    e.preventDefault();
    setError('');

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First and last name are required.');
      return;
    }
    const cleanedSubjects = form.subjects
      .map((s) => ({ ...s, name: s.name.trim(), goal: s.goal.trim() }))
      .filter((s) => s.name);
    if (!cleanedSubjects.length) {
      setError('Please keep at least one subject.');
      return;
    }
    for (const slot of form.availability) {
      if (slot.startTime >= slot.endTime) {
        setError(`${slot.day}: start time must be before end time.`);
        return;
      }
    }

    setBusy(true);
    try {
      await profileApi.saveProfile(user.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        university: form.university,
        studyProgram: form.studyProgram,
        semester: form.semester === '' ? null : Number(form.semester),
        bio: form.bio
      });
      await profileApi.saveSubjects(user.id, cleanedSubjects, form.goals);
      await profileApi.saveAvailability(user.id, form.availability);

      const baselineStatus = JSON.parse(baseline).status;
      if (form.status !== baselineStatus) {
        await profileApi.setAccountStatus(user.id, form.status);
      }

      const fresh = await profileApi.get(user.id);
      setUser(fresh);
      const next = stateFromUser(fresh);
      setForm(next);
      setBaseline(JSON.stringify(next)); // clears the dirty flag
      setToast('Profile saved ✓');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-wrap">
      <Toast message={toast} onDone={() => setToast('')} />

      <div className="dashboard-hero">
        <div>
          <h1>Edit profile</h1>
          <p className="muted">Keep your details current. Changes apply once you save.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Back</button>
      </div>

      {error && <div className="error-banner">⚠ {error}</div>}

      <form onSubmit={save}>
        {/* Basic profile */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon">👤</span> Profile</span>
          </div>
          <div className="field-row">
            <div className="field">
              <label className="field-label">First name *</label>
              <input value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} required />
            </div>
            <div className="field">
              <label className="field-label">Last name *</label>
              <input value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} required />
            </div>
          </div>
          <div className="field">
            <label className="field-label">University</label>
            <input value={form.university} onChange={(e) => setField('university', e.target.value)} />
          </div>
          <div className="field-row">
            <div className="field">
              <label className="field-label">Study program</label>
              <input value={form.studyProgram} onChange={(e) => setField('studyProgram', e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Semester</label>
              <input
                type="number" min="1" max="30"
                value={form.semester}
                onChange={(e) => setField('semester', e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Short bio</label>
            <textarea rows="3" value={form.bio} onChange={(e) => setField('bio', e.target.value)} />
          </div>
        </div>

        {/* Subjects */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon">📖</span> Subjects</span>
          </div>
          {form.subjects.map((s, idx) => (
            <div className="subject-entry" key={idx}>
              <div className="field">
                {idx === 0 && <label className="field-label">Subject</label>}
                <input value={s.name} placeholder="e.g. Linear Algebra"
                  onChange={(e) => updateSubject(idx, { name: e.target.value })} />
              </div>
              <div className="field">
                {idx === 0 && <label className="field-label">Level</label>}
                <select value={s.level} onChange={(e) => updateSubject(idx, { level: e.target.value })}>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="field">
                {idx === 0 && <label className="field-label">Role</label>}
                <select value={s.role} onChange={(e) => updateSubject(idx, { role: e.target.value })}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="field">
                {idx === 0 && <label className="field-label">Personal goal</label>}
                <input value={s.goal} placeholder="optional"
                  onChange={(e) => updateSubject(idx, { goal: e.target.value })} />
              </div>
              <div style={{ paddingTop: idx === 0 ? 22 : 0 }}>
                <button type="button" className="btn-icon" title="Remove"
                  onClick={() => removeSubject(idx)} disabled={form.subjects.length === 1}>✕</button>
              </div>
            </div>
          ))}
          <button type="button" className="add-row-btn" onClick={addSubject}>+ Add subject</button>

          <hr className="section-divider" />
          <div className="card-title" style={{ marginBottom: 12 }}>
            <span className="card-title-icon">🎯</span> Learning goals
          </div>
          <div className="goal-input-row">
            <div className="field">
              <input value={goalInput} placeholder="e.g. Pass the exam by July"
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGoal(); } }} />
            </div>
            <button type="button" className="btn btn-ghost" onClick={addGoal}>Add</button>
          </div>
          {form.goals.length > 0 && (
            <div className="chip-list">
              {form.goals.map((g, idx) => (
                <span className="chip chip-accent" key={idx}>
                  {g}
                  <button className="chip-remove" type="button" onClick={() => removeGoal(idx)}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Availability */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon">🗓</span> Availability</span>
          </div>
          {form.availability.map((slot, idx) => (
            <div className="slot-entry" key={idx}>
              <div className="field">
                {idx === 0 && <label className="field-label">Day</label>}
                <select value={slot.day} onChange={(e) => updateSlot(idx, { day: e.target.value })}>
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="field">
                {idx === 0 && <label className="field-label">From</label>}
                <input type="time" value={slot.startTime} onChange={(e) => updateSlot(idx, { startTime: e.target.value })} />
              </div>
              <div className="field">
                {idx === 0 && <label className="field-label">To</label>}
                <input type="time" value={slot.endTime} onChange={(e) => updateSlot(idx, { endTime: e.target.value })} />
              </div>
              <div style={{ paddingTop: idx === 0 ? 22 : 0 }}>
                <button type="button" className="btn-icon" title="Remove"
                  onClick={() => removeSlot(idx)} disabled={form.availability.length === 1}>✕</button>
              </div>
            </div>
          ))}
          <button type="button" className="add-row-btn" onClick={addSlot}>+ Add time slot</button>
        </div>

        {/* Account status */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><span className="card-title-icon">⚙️</span> Account</span>
          </div>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={form.status === 'active'}
              onChange={(e) => setField('status', e.target.checked ? 'active' : 'deactivated')}
            />
            <span>
              <strong>Account active</strong>
              <span className="muted" style={{ display: 'block', fontSize: '.8rem' }}>
                When deactivated, you won't appear in anyone's matches. You can reactivate any time.
              </span>
            </span>
          </label>

          {/* US-13: permanent account deletion */}
          <hr className="section-divider" />
          <div className="danger-zone">
            <div>
              <strong>Delete account</strong>
              <span className="muted" style={{ display: 'block', fontSize: '.8rem' }}>
                Permanently removes your profile, matches and messages. This cannot be undone.
              </span>
            </div>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmDelete(true)}
            >
              Delete account
            </button>
          </div>
        </div>

        {/* Sticky save bar */}
        <div className="save-bar">
          <span className={`save-hint ${dirty ? 'dirty' : ''}`}>
            {dirty ? '● Unsaved changes' : 'All changes saved'}
          </span>
          <button type="submit" className="btn btn-primary" disabled={busy || !dirty}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      {/* US-13: confirm before permanent deletion */}
      {confirmDelete && (
        <div className="modal-overlay" onMouseDown={() => setConfirmDelete(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete account?</h2>
              <button className="btn-icon" onClick={() => setConfirmDelete(false)} title="Close">✕</button>
            </div>
            <p className="muted" style={{ marginBottom: 16 }}>
              This permanently deletes your profile, all your matches and your messages.
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                Yes, delete my account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
