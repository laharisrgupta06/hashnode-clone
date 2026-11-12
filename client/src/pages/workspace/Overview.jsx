import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import api from '../../api/axios.js';
import useRequest from '../../hooks/useRequest.js';
import PageMeta from '../../components/common/PageMeta.jsx';
import Icon from '../../components/common/Icon.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import PublicationMark from '../../components/publication/PublicationMark.jsx';
import { formatDate } from '../../utils/format.js';
import { articlePath, publicationAddresses, publicationPath, workspacePath } from '../../utils/publication.js';
import SiteLink from '../../components/publication/SiteLink.jsx';

// A publication's home in the workspace: identity, real counts, recent articles and quick actions.
export default function Overview() {
  const { publication } = useOutletContext();
  const location = useLocation();
  const [notice, setNotice] = useState(location.state?.notice ?? '');
  const noticeRef = useRef(null);
  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  const recent = useRequest((signal) => api.get(`/publications/${publication.slug}/manage/posts`, { signal }).then((r) => r.data.posts.slice(0, 5)), [publication.slug]);
  const address = publicationAddresses(publication.slug).current;

  return (
    <section>
      <PageMeta title={`${publication.name} overview`} />
      {notice && (
        <div className="alert alert-success" role="status" tabIndex={-1} ref={noticeRef}>
          <Icon name="circle-check" />
          <div className="alert-body">
            <p>{notice}</p>
          </div>
          <button type="button" className="icon-button alert-dismiss" aria-label="Dismiss message" onClick={() => setNotice('')}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      <header className="ws-hero">
        <PublicationMark publication={publication} size={64} />
        <div className="ws-hero-text">
          <p className="eyebrow">Overview</p>
          <h1>{publication.name}</h1>
          {publication.tagline && <p className="ws-hero-tagline">{publication.tagline}</p>}
          <p className="ws-hero-address">
            <Icon name="globe" size={16} />
            <SiteLink to={publicationPath(publication.slug)}>{address}</SiteLink>
          </p>
        </div>
      </header>

      <dl className="stat-row">
        <div className="stat">
          <dt>Published articles</dt>
          <dd>{publication.publishedCount}</dd>
        </div>
        <div className="stat">
          <dt>Drafts</dt>
          <dd>{publication.draftCount}</dd>
        </div>
        <div className="stat">
          <dt>Created</dt>
          <dd className="stat-small">{formatDate(publication.createdAt)}</dd>
        </div>
      </dl>

      <div className="quick-actions">
        <Link to={workspacePath(publication.slug, 'write')} className="quick-action primary">
          <Icon name="square-pen" />
          <span>
            <strong>Write an article</strong>
            <small>Start a new draft in this publication</small>
          </span>
        </Link>
        <SiteLink to={publicationPath(publication.slug)} className="quick-action">
          <Icon name="external-link" />
          <span>
            <strong>View publication</strong>
            <small>See the website readers see</small>
          </span>
        </SiteLink>
        <Link to={workspacePath(publication.slug, 'appearance')} className="quick-action">
          <Icon name="palette" />
          <span>
            <strong>Manage appearance</strong>
            <small>Colour, typography and layout</small>
          </span>
        </Link>
        <Link to={workspacePath(publication.slug, 'settings')} className="quick-action">
          <Icon name="settings" />
          <span>
            <strong>Edit settings</strong>
            <small>Name, description, logo and cover</small>
          </span>
        </Link>
      </div>

      <div className="section-head">
        <h2 className="section-title">Recent articles</h2>
        {recent.data && recent.data.length > 0 && (
          <Link to={workspacePath(publication.slug, 'articles')} className="btn btn-ghost">
            All articles
            <Icon name="arrow-right" size={16} />
          </Link>
        )}
      </div>
      {recent.status === 'loading' && !recent.data && <LoadingSpinner label="Loading articles…" />}
      {recent.data && recent.data.length === 0 && (
        <div className="ws-empty">
          <p>No articles yet. Your first draft stays private until you publish it.</p>
          <Link to={workspacePath(publication.slug, 'write')} className="btn btn-primary">
            Write the first article
          </Link>
        </div>
      )}
      {recent.data && recent.data.length > 0 && (
        <ul className="manage-list">
          {recent.data.map((post) => (
            <li key={post._id} className="manage-item compact">
              <div className="manage-item-main">
                <div className="manage-item-top">
                  <span className={`status-badge status-${post.status}`}>{post.status === 'published' ? 'Published' : 'Draft'}</span>
                  <span className="manage-item-dates">Updated {formatDate(post.updatedAt)}</span>
                </div>
                <h3 className="manage-item-title">
                  <Link to={`/publications/${publication.slug}/editor/${post._id}`}>{post.title}</Link>
                </h3>
              </div>
              {post.status === 'published' && (
                <SiteLink to={articlePath(publication.slug, post.slug)} className="btn btn-ghost" aria-label={`View ${post.title}`}>
                  <Icon name="eye" size={16} />
                  <span aria-hidden="true">View</span>
                </SiteLink>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
