import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setResetUrl('');
    setBusy(true);

    try {
      const data = await authApi.forgotPassword(email);
      setSuccess(data.message);
      if (data.resetLink) {
        // Map backend link (which might assume server/client ports) to client path
        const token = data.token;
        setResetUrl(`/reset-password?token=${token}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo">
          <span className="logo-icon">📚</span>
          <span className="logo-name">Study Buddy</span>
        </div>

        <h1>Passwort vergessen</h1>
        <p className="subtitle">Geben Sie Ihre E-Mail-Adresse ein, um einen Reset-Link zu erhalten.</p>

        {error && <div className="error-banner">⚠ {error}</div>}
        {success && <div className="toast toast-success" style={{ position: 'relative', top: 0, left: 0, transform: 'none', marginBottom: 16, width: '100%' }}>✓ {success}</div>}

        {!resetUrl ? (
          <form onSubmit={onSubmit}>
            <div className="field">
              <label className="field-label">E-Mail-Adresse</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ihre.email@example.com"
                required
                autoComplete="email"
                autoFocus
                disabled={busy}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
              {busy ? 'Wird gesendet…' : 'Reset-Link senden'}
            </button>
          </form>
        ) : (
          <div style={{ marginTop: 12, padding: 16, background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              <strong>Demo-Modus:</strong> Da wir keine echten E-Mails senden, wurde der Reset-Link hier generiert. Klicken Sie auf den Button unten, um Ihr Passwort zurückzusetzen:
            </p>
            <Link to={resetUrl} className="btn btn-primary btn-full" style={{ textAlign: 'center', justifyContent: 'center' }}>
              Passwort zurücksetzen
            </Link>
          </div>
        )}

        <p className="auth-footer" style={{ marginTop: 24 }}>
          Zurück zum <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
