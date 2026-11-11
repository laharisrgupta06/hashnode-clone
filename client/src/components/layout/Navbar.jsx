import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';

// The user's picture, or their first letter if they have none (or the image fails to load).
function Avatar({ user }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initial = [...(user.name || '?').trim()][0]?.toUpperCase() || '?';

  if (user.avatarUrl && !imageFailed) {
    return <img className="avatar" src={user.avatarUrl} alt="" onError={() => setImageFailed(true)} />;
  }
  return (
    <span className="avatar avatar-fallback" aria-hidden="true">
      {initial}
    </span>
  );
}

// What it shows depends on the auth status, so it never claims the wrong thing:
//   loading        -> only the links that do not depend on being logged in
//   guest          -> Login / Register
//   authenticated  -> Dashboard / avatar / Logout
//   unavailable    -> a note and a Retry button (the saved login is kept)
export default function Navbar() {
  const { status, user, logout, retry } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/'); // a deliberate logout always ends on the home page
    logout();
  };

  return (
    <header className="navbar">
      <nav className="container navbar-inner" aria-label="Main">
        <Link to="/" className="navbar-brand">
          Hashnode Clone
        </Link>
        <div className="navbar-links">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/tags">Tags</NavLink>

          {status === 'guest' && (
            <>
              <NavLink to="/login">Login</NavLink>
              <NavLink to="/register">Register</NavLink>
            </>
          )}

          {status === 'authenticated' && user && (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <Link to={`/profile/${user._id}`} className="navbar-avatar" aria-label={`${user.name}, view your profile`} title={user.name}>
                <Avatar key={user.avatarUrl} user={user} />
              </Link>
              <button type="button" className="btn-link" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}

          {status === 'unavailable' && (
            <span className="navbar-status" role="status">
              Can&apos;t verify your session.{' '}
              <button type="button" className="btn-link" onClick={retry}>
                Retry
              </button>
            </span>
          )}
        </div>
      </nav>
    </header>
  );
}
