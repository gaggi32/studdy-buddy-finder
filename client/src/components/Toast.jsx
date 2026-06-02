import { useEffect } from 'react';

// Lightweight auto-dismissing confirmation banner (US-08 "Bestätigung",
// US-10 save confirmation). Render with a falsy `message` to hide it.
export default function Toast({ message, type = 'success', onDone, duration = 2500 }) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [message, duration, onDone]);

  if (!message) return null;

  return (
    <div className={`toast toast-${type}`} role="status">
      <span className="toast-icon">{type === 'success' ? '✓' : '⚠'}</span>
      {message}
    </div>
  );
}
