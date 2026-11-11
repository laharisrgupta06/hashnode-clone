import { Link } from 'react-router-dom';

// Shown for any URL that matches no route (a mistyped address, an old link...).
export default function NotFound() {
  return (
    <section className="page-shell">
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <p>
        <Link to="/">Go to the home page</Link>
      </p>
    </section>
  );
}
