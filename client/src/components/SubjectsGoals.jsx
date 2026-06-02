import { useState } from 'react';

const EMPTY_SUBJECT = { name: '', level: 'beginner', goal: '' };
const LEVELS = ['beginner', 'intermediate', 'advanced'];

export default function SubjectsGoals({ initialSubjects, initialGoals, onSave, onBack }) {
  const [subjects, setSubjects] = useState(
    initialSubjects?.length ? initialSubjects : [{ ...EMPTY_SUBJECT }]
  );
  const [goalInput, setGoalInput] = useState('');
  const [goals, setGoals] = useState(initialGoals || []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function updateSubject(idx, patch) {
    setSubjects((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function addSubject() {
    setSubjects((prev) => [...prev, { ...EMPTY_SUBJECT }]);
  }

  function removeSubject(idx) {
    setSubjects((prev) => prev.filter((_, i) => i !== idx));
  }

  function addGoal() {
    const v = goalInput.trim();
    if (!v) return;
    setGoals((prev) => [...prev, v]);
    setGoalInput('');
  }

  function removeGoal(idx) {
    setGoals((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');

    const cleaned = subjects
      .map((s) => ({ ...s, name: s.name.trim(), goal: s.goal.trim() }))
      .filter((s) => s.name);

    if (!cleaned.length) {
      setError('Please add at least one subject.');
      return;
    }

    setBusy(true);
    try {
      await onSave(cleaned, goals);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h2 style={{ marginBottom: 4 }}>Subjects & learning goals</h2>
      <p className="muted" style={{ marginBottom: 24 }}>What do you want to study, and at what level?</p>

      {error && <div className="error-banner">⚠ {error}</div>}

      {/* Subject rows */}
      {subjects.map((s, idx) => (
        <div className="subject-entry" key={idx}>
          <div className="field">
            {idx === 0 && <label className="field-label">Subject</label>}
            <input
              placeholder="e.g. Linear Algebra"
              value={s.name}
              onChange={(e) => updateSubject(idx, { name: e.target.value })}
            />
          </div>

          <div className="field">
            {idx === 0 && <label className="field-label">Level</label>}
            <select value={s.level} onChange={(e) => updateSubject(idx, { level: e.target.value })}>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className="field">
            {idx === 0 && <label className="field-label">Personal goal (optional)</label>}
            <input
              placeholder="e.g. Pass the midterm"
              value={s.goal}
              onChange={(e) => updateSubject(idx, { goal: e.target.value })}
            />
          </div>

          <div style={{ paddingTop: idx === 0 ? 22 : 0 }}>
            <button
              type="button"
              className="btn-icon"
              onClick={() => removeSubject(idx)}
              disabled={subjects.length === 1}
              title="Remove"
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <button type="button" className="add-row-btn" onClick={addSubject}>
        + Add subject
      </button>

      {/* Learning goals */}
      <hr className="section-divider" />
      <h2 style={{ marginBottom: 4 }}>Overall goals</h2>
      <p className="muted" style={{ marginBottom: 16 }}>Broader targets — exams, projects, certifications.</p>

      <div className="goal-input-row">
        <div className="field">
          <input
            placeholder="e.g. Pass the exam by July"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGoal(); } }}
          />
        </div>
        <button type="button" className="btn btn-ghost" onClick={addGoal}>Add</button>
      </div>

      {goals.length > 0 && (
        <div className="chip-list" style={{ marginBottom: 8 }}>
          {goals.map((g, idx) => (
            <span className="chip chip-accent" key={idx}>
              {g}
              <button className="chip-remove" type="button" onClick={() => removeGoal(idx)}>✕</button>
            </span>
          ))}
        </div>
      )}

      <div className="step-nav">
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Back</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Continue →'}
        </button>
      </div>
    </form>
  );
}
