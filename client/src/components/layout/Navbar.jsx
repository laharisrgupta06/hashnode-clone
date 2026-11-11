import { Link, NavLink } from 'react-router-dom';

// Links that work today. The logged-in version (Dashboard, avatar, Logout) arrives with the auth layer.
export default function Navbar() {
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
          <NavLink to="/login">Login</NavLink>
          <NavLink to="/register">Register</NavLink>
        </div>
      </nav>
    </header>
  );
}
