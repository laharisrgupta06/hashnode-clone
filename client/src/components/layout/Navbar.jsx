import { forwardRef, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import { SITE } from '../../config/site.js';
import Icon from '../common/Icon.jsx';
import Avatar from '../common/Avatar.jsx';
import { PLATFORM_LINKS } from './MainNav.jsx';

// Article search in the top bar (wide screens). Submitting opens Explore filtered by the term.
function TopbarSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const urlTerm = location.pathname === '/explore' ? params.get('q') ?? '' : '';
  const [term, setTerm] = useState(urlTerm);

  useEffect(() => setTerm(urlTerm), [urlTerm]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const clean = term.trim();
    navigate(clean ? `/explore?q=${encodeURIComponent(clean)}` : '/explore');
  };

  return (
    <form className="topbar-search" role="search" onSubmit={handleSubmit}>
      <label htmlFor="topbar-search-input" className="visually-hidden">
        Search articles
      </label>
      <Icon name="search" size={16} />
      <input id="topbar-search-input" type="search" placeholder="Search articles" value={term} onChange={(event) => setTerm(event.target.value)} />
    </form>
  );
}

// The platform top bar. Account area depends on the auth status, so it never claims the wrong thing:
//   loading -> nothing; guest -> Log in / Get started; authenticated -> My publications / avatar / Log out;
//   unavailable -> a banner under the bar with Retry (the saved login is kept).
const Navbar = forwardRef(function Navbar({ menuOpen, onOpenMenu }, menuButtonRef) {
  const { status, user, logout, retry } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/'); // a deliberate logout always ends on the home page
    logout();
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button
          type="button"
          className="icon-button menu-button"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={onOpenMenu}
          ref={menuButtonRef}
        >
          <Icon name="menu" />
        </button>

        <Link to="/" className="brand" aria-label={`${SITE.name} home`}>
          <span className="brand-mark" aria-hidden="true">
            {SITE.name[0]}
          </span>
          <span aria-hidden="true">{SITE.name}</span>
        </Link>

        <nav className="topbar-links" aria-label="Platform">
          {PLATFORM_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <TopbarSearch />

        <nav className="topbar-actions" aria-label="Account">
          {status === 'guest' && (
            <>
              <Link to="/login" className="btn btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary hide-narrow">
                Get started
              </Link>
            </>
          )}

          {status === 'authenticated' && user && (
            <>
              <Link to="/publications" className="btn btn-secondary hide-narrow">
                My publications
              </Link>
              <Link to={`/profile/${user._id}`} className="account-avatar" title={user.name}>
                <Avatar key={user.avatarUrl} user={user} />
                <span className="visually-hidden">Your profile ({user.name})</span>
              </Link>
              <button type="button" className="btn btn-ghost" onClick={handleLogout} aria-label="Log out">
                <Icon name="log-out" size={18} />
                <span className="label-wide-only" aria-hidden="true">
                  Log out
                </span>
              </button>
            </>
          )}
        </nav>
      </div>

      {status === 'unavailable' && (
        <div className="session-banner" role="status">
          <p>We can&apos;t verify your session right now. You are still logged in.</p>
          <button type="button" className="btn-link" onClick={retry}>
            Retry
          </button>
        </div>
      )}
    </header>
  );
});

export default Navbar;
