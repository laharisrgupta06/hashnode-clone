import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import MobileNav from './MobileNav.jsx';
import Footer from './Footer.jsx';

// The frame around every PLATFORM page: skip link, top bar, drawer (phones/tablets), page, footer.
// Publication websites (/p/...) do not use it: they have their own editorial frame.
// Layout variants: the landing page runs full width; the creator workspace uses a wide area.
export default function AppShell({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const location = useLocation();

  const closeMenu = useCallback((reason) => {
    setMenuOpen(false);
    if (reason === 'dismiss') menuButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const query = window.matchMedia?.('(min-width: 1024px)');
    if (!query) return undefined;
    const onChange = (event) => {
      if (event.matches) setMenuOpen(false);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const path = location.pathname;
  const variant = path === '/' ? 'main-full' : /^\/publications\/[^/]+\/.+/.test(path) ? 'main-wide' : 'content-inner';

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar ref={menuButtonRef} menuOpen={menuOpen} onOpenMenu={() => setMenuOpen(true)} />
      <MobileNav open={menuOpen} onClose={closeMenu} />
      <div className="content">
        <main id="main" className={variant} tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
