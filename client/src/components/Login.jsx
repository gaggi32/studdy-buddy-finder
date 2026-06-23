import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const infoMessage = location.state?.infoMessage || '';

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(email, password);
      navigate(u.profile ? '/dashboard' : '/onboarding');
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

        <h1>Welcome back</h1>
        <p className="auth-card subtitle">Sign in to your account to continue.</p>

        {infoMessage && (
          <div className="toast toast-success" style={{ position: 'relative', top: 0, left: 0, transform: 'none', marginBottom: 16, width: '100%' }}>
            ✓ {infoMessage}
          </div>
        )}

        {error && <div className="error-banner">⚠ {error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label className="field-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="field-label">Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.78rem', color: 'var(--accent-h)' }}>
                Passwort vergessen?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer">
          No account yet? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
