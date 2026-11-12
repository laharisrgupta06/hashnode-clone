import { NavLink } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import Icon from '../common/Icon.jsx';

// Platform destinations, used by the top bar (desktop) and the mobile drawer.
export const PLATFORM_LINKS = [
  { to: '/explore', label: 'Explore', icon: 'search' },
  { to: '/tags', label: 'Topics', icon: 'tag' },
  { to: '/about', label: 'About', icon: 'info' },
];

const ACCOUNT_LINKS = (user) => [
  { to: '/dashboard', label: 'Dashboard', icon: 'file-text' },
  { to: '/publications', label: 'My publications', icon: 'layout-dashboard' },
  { to: `/profile/${user._id}`, label: 'Your profile', icon: 'user' },
  { to: '/settings', label: 'Account settings', icon: 'settings' },
];

function NavItems({ items, onNavigate }) {
  return (
    <ul className="nav-list">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink to={item.to} end={item.end} className="nav-item" onClick={onNavigate}>
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

// The drawer's navigation: platform links, then the signed-in user's workspace links.
export default function MainNav({ onNavigate }) {
  const { status, user } = useAuth();
  return (
    <>
      <section className="nav-section">
        <h2 className="nav-heading">DevPress</h2>
        <NavItems items={[{ to: '/', label: 'Home', icon: 'home', end: true }, ...PLATFORM_LINKS]} onNavigate={onNavigate} />
      </section>
      {status === 'authenticated' && user && (
        <section className="nav-section">
          <h2 className="nav-heading">Your workspace</h2>
          <NavItems items={ACCOUNT_LINKS(user)} onNavigate={onNavigate} />
        </section>
      )}
    </>
  );
}
