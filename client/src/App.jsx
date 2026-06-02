import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Register from './components/Register.jsx';
import Login from './components/Login.jsx';
import OnboardingFlow from './components/OnboardingFlow.jsx';
import Dashboard from './components/Dashboard.jsx';

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function initials(email) {
  return email ? email[0].toUpperCase() : '?';
}

export default function App() {
  const { user, logout } = useAuth();

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">📚</span>
          <span className="brand-name">Study Buddy</span>
        </Link>

        <span className="navbar-spacer" />

        {user ? (
          <div className="navbar-meta">
            <div className="nav-avatar">{initials(user.email)}</div>
            <span className="nav-email">{user.email}</span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              Sign out
            </button>
          </div>
        ) : (
          <div className="navbar-meta">
            <Link to="/login">
              <button className="btn btn-ghost btn-sm">Sign in</button>
            </Link>
            <Link to="/register">
              <button className="btn btn-primary btn-sm">Register</button>
            </Link>
          </div>
        )}
      </nav>

      <Routes>
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/onboarding"
          element={<Protected><OnboardingFlow /></Protected>}
        />
        <Route
          path="/dashboard"
          element={<Protected><Dashboard /></Protected>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
