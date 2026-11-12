import { Link } from 'react-router-dom';
import { SITE } from '../../config/site.js';
import useAuth from '../../hooks/useAuth.js';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { to: '/explore', label: 'Explore' },
      { to: '/tags', label: 'Topics' },
      { to: '/about', label: 'About' },
    ],
  },
  {
    title: 'Writers',
    // filled per login state below
    links: null,
  },
  {
    title: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy Policy' },
      { to: '/terms', label: 'Terms and Conditions' },
    ],
  },
];

// Platform footer. Every link points to a working page.
const WRITER_LINKS = {
  signedIn: [
    { to: '/publications', label: 'My publications' },
    { to: '/publications/new', label: 'Create a publication' },
  ],
  guest: [
    { to: '/register', label: 'Create an account' },
    { to: '/login', label: 'Log in' },
  ],
};

export default function Footer() {
  const { status } = useAuth();
  const year = new Date().getFullYear();
  const columns = COLUMNS.map((c) => (c.links ? c : { ...c, links: status === 'authenticated' ? WRITER_LINKS.signedIn : WRITER_LINKS.guest }));
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              {SITE.name[0]}
            </span>
            {SITE.name}
          </Link>
          <p>Publications for developers who write.</p>
        </div>
        <nav className="footer-columns" aria-label="Footer">
          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="footer-heading">{column.title}</h2>
              <ul className="footer-links">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="footer-legal">
        <p>
          &copy; {year} {SITE.name}. An independent project, not affiliated with Hashnode.
        </p>
      </div>
    </footer>
  );
}
