import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api.js';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Ungültiger oder fehlender Reset-Token in der URL.');
    }
  }, [token]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Kein gültiger Token vorhanden.');
      return;
    }
    if (password !== confirm) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }
    if (password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }

    setBusy(true);
    try {
      const data = await authApi.resetPassword(token, password);
      setSuccess(data.message);
      setTimeout(() => {
        navigate('/login', { state: { infoMessage: 'Passwort erfolgreich geändert. Sie können sich nun einloggen.' } });
      }, 2000);
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

        <h1>Neues Passwort festlegen</h1>
        <p className="auth-card subtitle">Geben Sie Ihr neues Passwort für das Konto ein.</p>

        {error && <div className="error-banner">⚠ {error}</div>}
        {success && <div className="toast toast-success" style={{ position: 'relative', top: 0, left: 0, transform: 'none', marginBottom: 16, width: '100%' }}>✓ {success}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label className="field-label">Neues Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 Zeichen"
              required
              disabled={busy || !token}
              autoFocus
            />
          </div>

          <div className="field">
            <label className="field-label">Passwort bestätigen</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Wiederholen Sie das Passwort"
              required
              disabled={busy || !token}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={busy || !token}>
            {busy ? 'Passwort wird zurückgesetzt…' : 'Passwort speichern'}
          </button>
        </form>

        <p className="auth-footer" style={{ marginTop: 24 }}>
          Zurück zum <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
