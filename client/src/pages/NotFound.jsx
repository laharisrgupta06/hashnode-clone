import { Link } from 'react-router-dom';
import PageMeta from '../components/common/PageMeta.jsx';

// Shown for any URL that matches no route (a mistyped address, an old link...).
export default function NotFound() {
  return (
    <section className="page-header page-header-error">
      <PageMeta title="Page not found" description="The page you asked for does not exist." />
      <p className="error-numeral" aria-hidden="true">
        404
      </p>
      <p className="eyebrow">Error 404</p>
      <h1>Page not found</h1>
      <p>The address may be mistyped, or the page may have been moved or deleted.</p>
      <div className="page-actions">
        <Link to="/" className="btn btn-primary">
          Go to the home page
        </Link>
        <Link to="/explore" className="btn btn-secondary">
          Explore publications
        </Link>
      </div>
    </section>
  );
}
