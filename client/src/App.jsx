import { createBrowserRouter, Outlet, Navigate, Link, NavLink } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Register from './components/Register.jsx';
import Login from './components/Login.jsx';
import OnboardingFlow from './components/OnboardingFlow.jsx';
import Dashboard from './components/Dashboard.jsx';
import Matches from './components/Matches.jsx';
import Messages from './components/Messages.jsx';
import Chat from './components/Chat.jsx';
import EditProfile from './components/EditProfile.jsx';

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function initials(email) {
  return email ? email[0].toUpperCase() : '?';
}

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

// App shell: top navigation + the active route below it.
function RootLayout() {
  const { user, logout } = useAuth();

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
            <NavLink to="/matches" className="nav-link">Find partners</NavLink>
            <NavLink to="/messages" className="nav-link">Messages</NavLink>
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
      { path: '/onboarding', element: <Protected><OnboardingFlow /></Protected> },
      { path: '/dashboard', element: <Protected><Dashboard /></Protected> },
      { path: '/matches', element: <Protected><Matches /></Protected> },
      { path: '/messages', element: <Protected><Messages /></Protected> },
      { path: '/messages/:connectionId', element: <Protected><Chat /></Protected> },
      { path: '/profile/edit', element: <Protected><EditProfile /></Protected> },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
]);
