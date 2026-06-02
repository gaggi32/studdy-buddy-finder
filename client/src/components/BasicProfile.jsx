import { useState } from 'react';

const EMPTY = {
  firstName: '',
  lastName: '',
  university: '',
  studyProgram: '',
  semester: '',
  bio: ''
};

export default function BasicProfile({ initial, onSave }) {
  const [form, setForm] = useState({ ...EMPTY, ...(initial || {}) });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSave({
        ...form,
        semester: form.semester === '' ? null : Number(form.semester)
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h2 style={{ marginBottom: 4 }}>Tell us about yourself</h2>
      <p className="muted" style={{ marginBottom: 24 }}>This is what other students will see on your profile.</p>

      {error && <div className="error-banner">⚠ {error}</div>}

      <div className="field-row">
        <div className="field">
          <label className="field-label">First name *</label>
          <input value={form.firstName} onChange={set('firstName')} placeholder="Alice" required />
        </div>
        <div className="field">
          <label className="field-label">Last name *</label>
          <input value={form.lastName} onChange={set('lastName')} placeholder="Schmidt" required />
        </div>
      </div>

      <div className="field">
        <label className="field-label">University</label>
        <input value={form.university} onChange={set('university')} placeholder="e.g. TU Berlin" />
      </div>

      <div className="field-row">
        <div className="field">
          <label className="field-label">Study program</label>
          <input value={form.studyProgram} onChange={set('studyProgram')} placeholder="e.g. Computer Science" />
        </div>
        <div className="field">
          <label className="field-label">Semester</label>
          <input
            type="number"
            min="1"
            max="30"
            value={form.semester}
            onChange={set('semester')}
            placeholder="e.g. 4"
          />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Short bio</label>
        <textarea
          rows="3"
          value={form.bio}
          onChange={set('bio')}
          placeholder="A few words about what you're looking for in a study partner…"
        />
      </div>

      <div className="step-nav">
        <span />
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Continue →'}
        </button>
      </div>
    </form>
  );
}
