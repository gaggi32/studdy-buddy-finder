import { useEffect } from 'react';
import { createBrowserRouter, Outlet, Navigate, Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Register from './components/Register.jsx';
import Login from './components/Login.jsx';
import ForgotPassword from './components/ForgotPassword.jsx';
import ResetPassword from './components/ResetPassword.jsx';
import OnboardingFlow from './components/OnboardingFlow.jsx';
import Dashboard from './components/Dashboard.jsx';
import Matches from './components/Matches.jsx';
import Messages from './components/Messages.jsx';
import Chat from './components/Chat.jsx';
import EditProfile from './components/EditProfile.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import { connectionApi, profileApi } from './api.js';

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function ProtectedAdmin({ children }) {
  const { user } = useAuth();
  return user && user.isAdmin ? children : <Navigate to="/dashboard" replace />;
}

function initials(email) {
  return email ? email[0].toUpperCase() : '?';
}

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

function RootLayout() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  // Sync user status from server on mount/reload
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    profileApi.get(user.id)
      .then((fresh) => {
        if (!cancelled) setUser(fresh);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id, setUser]);

  async function handleContactAdmin() {
    try {
      const conn = await connectionApi.contactAdmin();
      navigate(`/messages/${conn.id}`);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">📚</span>
          <span className="brand-name">Study Buddy</span>
        </Link>

        {user && (
          <div className="navbar-links">
            <NavLink to="/dashboard" className="nav-link">Dashboard</NavLink>
            {user.status !== 'locked' && (
              <>
                <NavLink to="/matches" className="nav-link">Find partners</NavLink>
                <NavLink to="/messages" className="nav-link">Messages</NavLink>
              </>
            )}
            {user.isAdmin && <NavLink to="/admin" className="nav-link">Admin</NavLink>}
          </div>
        )}

        <span className="navbar-spacer" />

        {user ? (
          <div className="navbar-meta">
            <div className="nav-avatar">{initials(user.email)}</div>
            <span className="nav-email">{user.email}</span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
          </div>
        ) : (
          <div className="navbar-meta">
            <Link to="/login"><button className="btn btn-ghost btn-sm">Sign in</button></Link>
            <Link to="/register"><button className="btn btn-primary btn-sm">Register</button></Link>
          </div>
        )}
      </nav>

      {user && user.status === 'locked' && (
        <div style={{
          background: 'var(--danger-bg)',
          color: 'var(--danger)',
          borderBottom: '1px solid #7f1d1d44',
          padding: '10px 24px',
          textAlign: 'center',
          fontSize: '.875rem',
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span>⚠️ Ihr Konto wurde gesperrt. Sie können keine Matches sehen oder neue Nachrichten an andere senden.</span>
          <button className="btn btn-sm btn-danger" onClick={handleContactAdmin} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
            Support kontaktieren
          </button>
        </div>
      )}

      <Outlet />
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <HomeRedirect /> },
      { path: '/register', element: <Register /> },
      { path: '/login', element: <Login /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
      { path: '/reset-password', element: <ResetPassword /> },
      { path: '/onboarding', element: <Protected><OnboardingFlow /></Protected> },
      { path: '/dashboard', element: <Protected><Dashboard /></Protected> },
      { path: '/matches', element: <Protected><Matches /></Protected> },
      { path: '/messages', element: <Protected><Messages /></Protected> },
      { path: '/messages/:connectionId', element: <Protected><Chat /></Protected> },
      { path: '/profile/edit', element: <Protected><EditProfile /></Protected> },
      { path: '/admin', element: <ProtectedAdmin><AdminDashboard /></ProtectedAdmin> },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
]);
