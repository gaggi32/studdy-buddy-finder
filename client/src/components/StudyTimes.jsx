import { useState } from 'react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const EMPTY_SLOT = { day: 'Monday', startTime: '18:00', endTime: '20:00' };

export default function StudyTimes({ initial, onSave, onBack }) {
  const [slots, setSlots] = useState(initial?.length ? initial : [{ ...EMPTY_SLOT }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update(idx, patch) {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function addSlot() {
    setSlots((prev) => [...prev, { ...EMPTY_SLOT }]);
  }

  function removeSlot(idx) {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');

    for (const slot of slots) {
      if (slot.startTime >= slot.endTime) {
        setError(`${slot.day}: start time must be before end time.`);
        return;
      }
    }

    setBusy(true);
    try {
      await onSave(slots);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h2 style={{ marginBottom: 4 }}>Your study schedule</h2>
      <p className="muted" style={{ marginBottom: 24 }}>When are you typically free? Add as many slots as you like.</p>

      {error && <div className="error-banner">⚠ {error}</div>}

      {slots.map((slot, idx) => (
        <div className="slot-entry" key={idx}>
          <div className="field">
            {idx === 0 && <label className="field-label">Day</label>}
            <select value={slot.day} onChange={(e) => update(idx, { day: e.target.value })}>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="field">
            {idx === 0 && <label className="field-label">From</label>}
            <input
              type="time"
              value={slot.startTime}
              onChange={(e) => update(idx, { startTime: e.target.value })}
            />
          </div>

          <div className="field">
            {idx === 0 && <label className="field-label">To</label>}
            <input
              type="time"
              value={slot.endTime}
              onChange={(e) => update(idx, { endTime: e.target.value })}
            />
          </div>

          <div style={{ paddingTop: idx === 0 ? 22 : 0 }}>
            <button
              type="button"
              className="btn-icon"
              onClick={() => removeSlot(idx)}
              disabled={slots.length === 1}
              title="Remove"
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <button type="button" className="add-row-btn" onClick={addSlot}>
        + Add time slot
      </button>

      <div className="step-nav">
        <button type="button" className="btn btn-ghost" onClick={onBack}>← Back</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Finish setup ✓'}
        </button>
      </div>
    </form>
  );
}
