import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import { SITE } from '../../config/site.js';
import Icon from '../common/Icon.jsx';
import Avatar from '../common/Avatar.jsx';
import MainNav from './MainNav.jsx';

// The slide-in navigation drawer for phones and tablets (CSS hides it from 1024px).
// Accessibility behaviour:
//   - it is a modal dialog: focus moves into it, Tab stays inside it, the page behind does not scroll
//   - Escape, the close button and a click on the dimmed backdrop close it
//   - choosing a link closes it
// `onClose(reason)`: reason 'dismiss' (Escape / close / backdrop) or 'navigate' (a link was chosen),
// so the shell knows whether to return focus to the menu button.
export default function MobileNav({ open, onClose }) {
  const { status, user, logout, retry } = useAuth();
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose('dismiss');
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      // Keep Tab inside the drawer: wrap from the last element to the first and back.
      const focusable = panelRef.current.querySelectorAll('a[href], button:not([disabled])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleLogout = () => {
    onClose('navigate');
    navigate('/'); // a deliberate logout always ends on the home page
    logout();
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={() => onClose('dismiss')} aria-hidden="true" />
      <div className="drawer" id="mobile-nav" role="dialog" aria-modal="true" aria-label="Menu" ref={panelRef}>
        <div className="drawer-header">
          <Link to="/" className="brand" onClick={() => onClose('navigate')}>
            <span className="brand-mark" aria-hidden="true">
              {SITE.name[0]}
            </span>
            {SITE.name}
          </Link>
          <button type="button" className="icon-button" aria-label="Close menu" onClick={() => onClose('dismiss')} ref={closeRef}>
            <Icon name="close" />
          </button>
        </div>

        <div className="drawer-body">
          <nav aria-label="Main">
            <MainNav onNavigate={() => onClose('navigate')} />
          </nav>

          <section className="nav-section" aria-label="Account">
            <h2 className="nav-heading">Account</h2>

            {status === 'guest' && (
              <ul className="nav-list">
                <li>
                  <Link to="/login" className="nav-item" onClick={() => onClose('navigate')}>
                    <Icon name="log-in" />
                    Log in
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="nav-item" onClick={() => onClose('navigate')}>
                    <Icon name="user-plus" />
                    Create account
                  </Link>
                </li>
              </ul>
            )}

            {status === 'authenticated' && user && (
              <>
                <div className="account-summary">
                  <Avatar key={user.avatarUrl} user={user} />
                  <span>{user.name}</span>
                </div>
                <ul className="nav-list">
                  <li>
                    <button type="button" className="nav-item" onClick={handleLogout}>
                      <Icon name="log-out" />
                      Log out
                    </button>
                  </li>
                </ul>
              </>
            )}

            {status === 'unavailable' && (
              <ul className="nav-list">
                <li>
                  <button type="button" className="nav-item" onClick={retry}>
                    <Icon name="refresh-cw" />
                    Retry session check
                  </button>
                </li>
              </ul>
            )}

            {status === 'loading' && <p className="nav-heading">Checking your session…</p>}
          </section>
        </div>
      </div>
    </>
  );
}
