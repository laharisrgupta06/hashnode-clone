import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import useAuth from '../hooks/useAuth.js';
import useRequest from '../hooks/useRequest.js';
import PageMeta from '../components/common/PageMeta.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import Icon from '../components/common/Icon.jsx';
import PublicationMark from '../components/publication/PublicationMark.jsx';
import { describeError } from '../utils/apiError.js';
import { plural } from '../utils/format.js';
import { publicationPath, workspacePath } from '../utils/publication.js';
import SiteLink from '../components/publication/SiteLink.jsx';

// The signed-in creator's starting point: their publications, or a first-time explanation.
export default function MyPublications() {
  const { user } = useAuth();
  const { status, data: pubs, error, reload } = useRequest((signal) => api.get('/publications/mine', { signal }).then((r) => r.data.publications), []);

  return (
    <section>
      <PageMeta title="My publications" />
      <header className="page-heading">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>My publications</h1>
          <p>{user ? `Signed in as ${user.name}.` : ''} Open a publication to write and manage its articles.</p>
        </div>
        {pubs && pubs.length > 0 && (
          <Link to="/publications/new" className="btn btn-primary">
            <Icon name="plus" size={16} />
            Create publication
          </Link>
        )}
      </header>

      {status === 'loading' && !pubs && <LoadingSpinner label="Loading your publications…" />}
      {status === 'error' && <ErrorMessage message={describeError(error).message} onRetry={reload} />}

      {pubs && pubs.length === 0 && (
        <div className="onboarding">
          <div className="onboarding-copy">
            <p className="eyebrow">Get started</p>
            <h2>Create your first publication</h2>
            <p>On DevPress, articles live inside a publication: a blog with its own name, address and look. Create one first, then write and publish articles in it.</p>
            <ul className="onboarding-points">
              <li>
                <Icon name="globe" size={18} />
                Its own public website at <code>/p/your-address</code>
              </li>
              <li>
                <Icon name="square-pen" size={18} />A Markdown editor with live preview and highlighted code
              </li>
              <li>
                <Icon name="palette" size={18} />
                Appearance settings for colour, typography and layout
              </li>
            </ul>
            <Link to="/publications/new" className="btn btn-primary btn-lg">
              Create your publication
            </Link>
          </div>
        </div>
      )}

      {pubs && pubs.length > 0 && (
        <ul className="my-pubs" aria-label="Your publications">
          {pubs.map((pub) => (
            <li key={pub._id} className="my-pub">
              <div className="my-pub-identity">
                <PublicationMark publication={pub} size={48} />
                <div>
                  <h2>
                    <Link to={workspacePath(pub.slug)}>{pub.name}</Link>
                  </h2>
                  <code>/p/{pub.slug}</code>
                  {(pub.tagline || pub.description) && <p>{pub.tagline || pub.description}</p>}
                </div>
              </div>
              <dl className="my-pub-stats">
                <div>
                  <dt>Published</dt>
                  <dd>{pub.publishedCount}</dd>
                </div>
                <div>
                  <dt>Drafts</dt>
                  <dd>{pub.draftCount}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd className={pub.publishedCount > 0 ? 'status-live' : 'status-new'}>{pub.publishedCount > 0 ? 'Live' : 'No articles yet'}</dd>
                </div>
              </dl>
              <div className="my-pub-actions">
                <Link to={workspacePath(pub.slug)} className="btn btn-primary">
                  Open workspace
                </Link>
                <SiteLink to={publicationPath(pub.slug)} className="btn btn-secondary">
                  <Icon name="external-link" size={16} />
                  Visit site
                </SiteLink>
                <Link to={workspacePath(pub.slug, 'settings')} className="btn btn-ghost" aria-label={`Settings for ${pub.name}`}>
                  <Icon name="settings" size={16} />
                  <span aria-hidden="true">Settings</span>
                </Link>
              </div>
              <p className="visually-hidden">{plural(pub.publishedCount, 'published article')}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
