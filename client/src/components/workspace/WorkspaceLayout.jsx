import { useCallback, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios.js';
import useRequest from '../../hooks/useRequest.js';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import ErrorMessage from '../common/ErrorMessage.jsx';
import EmptyState from '../common/EmptyState.jsx';
import Icon from '../common/Icon.jsx';
import PageMeta from '../common/PageMeta.jsx';
import PublicationMark from '../publication/PublicationMark.jsx';
import { describeError } from '../../utils/apiError.js';
import { publicationPath, workspacePath } from '../../utils/publication.js';
import SiteLink from '../publication/SiteLink.jsx';

// Workspace navigation. "Analytics" is clearly marked as planned: there is no analytics data yet.
const SECTIONS = [
  { to: 'dashboard', label: 'Overview', icon: 'layout-dashboard' },
  { to: 'articles', label: 'Articles', icon: 'files' },
  { to: 'articles?status=draft', label: 'Drafts', icon: 'file-text', match: (path, search) => path.endsWith('/articles') && search.includes('status=draft') },
  { to: 'write', label: 'Write', icon: 'square-pen' },
  { to: 'analytics', label: 'Analytics', icon: 'chart-no-axes-column', planned: true },
  { to: 'appearance', label: 'Appearance', icon: 'palette' },
  { to: 'domain', label: 'Domain', icon: 'globe' },
  { to: 'settings', label: 'Settings', icon: 'settings' },
];

// The frame of one publication's workspace. Only its owner gets past the server check (403 otherwise).
// Child pages read { publication, setPublication } from the Outlet context.
export default function WorkspaceLayout() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const pubRequest = useRequest((signal) => api.get(`/publications/${encodeURIComponent(slug)}/manage`, { signal }).then((r) => r.data.publication), [slug]);
  const mine = useRequest((signal) => api.get('/publications/mine', { signal }).then((r) => r.data.publications), []);
  const { status, data: publication, error, reload, setData } = pubRequest;
  const setPublication = useCallback((next) => setData(next), [setData]);

  // On phones the section list scrolls sideways: keep the current section visible.
  useEffect(() => {
    const active = document.querySelector('.ws-nav-item.active');
    const list = active?.closest('.ws-nav');
    if (!active || !list || list.scrollWidth <= list.clientWidth) return;
    list.scrollLeft = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
  }, [location.pathname, location.search, status]);

  if (status === 'loading' && !publication) return <LoadingSpinner label="Opening workspace…" />;
  if (status === 'error') {
    const code = error.response?.status;
    if (code === 403 || code === 404) {
      return (
        <EmptyState icon="circle-alert" title={code === 403 ? 'This is not your publication' : 'Publication not found'} action={<Link to="/publications" className="btn btn-primary">Go to my publications</Link>}>
          {code === 403 ? 'Only its owner can open this workspace.' : 'It may have been mistyped.'}
          <PageMeta title={code === 403 ? 'Not allowed' : 'Publication not found'} />
        </EmptyState>
      );
    }
    return <ErrorMessage message={describeError(error).message} onRetry={reload} />;
  }

  const isActive = (section) => {
    const base = `/publications/${publication.slug}/`;
    if (section.match) return section.match(location.pathname, location.search);
    if (section.to === 'articles') return location.pathname === `${base}articles` && !location.search.includes('status=draft');
    if (section.to === 'write') return location.pathname === `${base}write` || location.pathname.startsWith(`${base}editor/`);
    return location.pathname === `${base}${section.to}`;
  };

  return (
    <div className="workspace">
      <aside className="workspace-sidebar" aria-label="Publication workspace">
        <div className="ws-switcher">
          <PublicationMark publication={publication} size={36} />
          <div className="ws-switcher-text">
            {mine.data && mine.data.length > 1 ? (
              <>
                <label htmlFor="ws-switch" className="visually-hidden">
                  Switch publication
                </label>
                <select id="ws-switch" value={publication.slug} onChange={(event) => navigate(workspacePath(event.target.value))}>
                  {mine.data.map((p) => (
                    <option key={p._id} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <strong>{publication.name}</strong>
            )}
            <code>/p/{publication.slug}</code>
          </div>
        </div>

        <nav aria-label="Workspace sections">
          <ul className="ws-nav">
            {SECTIONS.map((section) => (
              <li key={section.to}>
                <NavLink to={`/publications/${publication.slug}/${section.to}`} className={() => `ws-nav-item${isActive(section) ? ' active' : ''}`} aria-current={isActive(section) ? 'page' : undefined} end>
                  <Icon name={section.icon} size={18} />
                  <span>{section.label}</span>
                  {section.planned && <span className="planned-badge">Planned</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ws-sidebar-foot">
          <SiteLink to={publicationPath(publication.slug)} className="btn btn-secondary btn-block">
            <Icon name="external-link" size={16} />
            View site
          </SiteLink>
          <Link to="/publications" className="ws-all-link">
            All publications
          </Link>
        </div>
      </aside>

      <div className="workspace-main">
        <Outlet context={{ publication, setPublication, reloadPublication: reload }} />
      </div>
    </div>
  );
}
