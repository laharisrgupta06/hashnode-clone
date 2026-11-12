import { useRouteError } from 'react-router-dom';
import { SITE } from '../config/site.js';
import { isChunkLoadError } from '../utils/lazyWithReload.js';

// Shown instead of React Router's bare default screen when rendering fails unexpectedly.
// It deliberately does not depend on the app shell (which may be what failed): plain links,
// a full-page reload, and the error message logged to the console for diagnosis.
export default function AppError() {
  const error = useRouteError();
  const outdated = isChunkLoadError(error);

  return (
    <main className="app-error" role="alert">
      <a href="/" className="brand app-error-brand">
        <span className="brand-mark" aria-hidden="true">
          {SITE.name[0]}
        </span>
        {SITE.name}
      </a>
      <h1>{outdated ? 'This page needs to be reloaded' : 'Something went wrong'}</h1>
      <p>
        {outdated
          ? `${SITE.name} was updated while this tab was open, so part of the page could not be loaded. Reloading fetches the current version.`
          : 'An unexpected error stopped this page from loading. Reloading usually fixes it. If it keeps happening, go back to the home page.'}
      </p>
      <div className="page-actions">
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Reload page
        </button>
        <a href="/" className="btn btn-secondary">
          Go to the home page
        </a>
      </div>
    </main>
  );
}
