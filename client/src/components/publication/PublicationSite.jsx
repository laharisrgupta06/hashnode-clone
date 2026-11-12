import { Link, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import api from '../../api/axios.js';
import useAuth from '../../hooks/useAuth.js';
import useRequest from '../../hooks/useRequest.js';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import PageMeta from '../common/PageMeta.jsx';
import PublicationMark from './PublicationMark.jsx';
import PubHome from '../../pages/pub/PubHome.jsx';
import PubArticle from '../../pages/pub/PubArticle.jsx';
import PubAbout from '../../pages/pub/PubAbout.jsx';
import { SITE } from '../../config/site.js';
import { appearanceStyle, workspacePath } from '../../utils/publication.js';
import { SiteContext } from './siteContext.js';


function PubFrame({ slug, base }) {
  const { user } = useAuth();
  const { status, data, error, reload } = useRequest(
    (signal) => api.get(`/publications/${encodeURIComponent(slug)}`, { signal }).then((r) => r.data),
    [slug]
  );

  if (status === 'loading' && !data) {
    return (
      <div className="pub-site pub-loading">
        <LoadingSpinner label="Loading publication…" />
      </div>
    );
  }
  if (status === 'error') {
    const missing = error.response?.status === 404;
    return (
      <div className="pub-site pub-missing">
        <PageMeta title={missing ? 'Publication not found' : 'Something went wrong'} />
        <main className="pub-container pub-message" id="main">
          <h1>{missing ? 'This publication does not exist' : 'This publication could not be loaded'}</h1>
          <p>{missing ? 'The address may be mistyped, or the publication may have been removed.' : 'Please try again in a moment.'}</p>
          <div className="pub-message-actions">
            {!missing && (
              <button type="button" className="pub-button" onClick={reload}>
                Try again
              </button>
            )}
            <a href="/" className="pub-button pub-button-quiet">
              Go to {SITE.name}
            </a>
          </div>
        </main>
      </div>
    );
  }

  const { publication, tags } = data;
  const isOwner = user && publication.owner && user._id === publication.owner._id;
  const home = base || '/';

  return (
    <SiteContext.Provider value={{ base, publication, tags }}>
      <div className={`pub-site font-${publication.appearance.fontPreset}`} style={appearanceStyle(publication.appearance)}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="pub-header">
          <div className="pub-container pub-header-inner">
            <Link to={home} className="pub-brand">
              <PublicationMark publication={publication} size={36} />
              <span>{publication.name}</span>
            </Link>
            <nav className="pub-nav" aria-label={`${publication.name} navigation`}>
              <NavLink to={home} end>
                Articles
              </NavLink>
              <NavLink to={`${base}/about`}>About</NavLink>
              {isOwner && (
                <Link to={workspacePath(publication.slug)} className="pub-manage">
                  Manage
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="pub-main">
          <Outlet />
        </main>
        <footer className="pub-footer">
          <div className="pub-container pub-footer-inner">
            <p>
              &copy; {new Date().getFullYear()} {publication.name}
            </p>
            <p>
              Published on{' '}
              <a href="/" className="pub-footer-platform">
                {SITE.name}
              </a>{' '}
              · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a>
            </p>
          </div>
        </footer>
      </div>
    </SiteContext.Provider>
  );
}

// The routes of one publication website. Mounted at /p/:slug/* (and at / on its own domain).
export default function PublicationSite({ slug, base }) {
  return (
    <Routes>
      <Route element={<PubFrame slug={slug} base={base} />}>
        <Route index element={<PubHome />} />
        <Route path="about" element={<PubAbout />} />
        <Route path=":postSlug" element={<PubArticle />} />
      </Route>
    </Routes>
  );
}
