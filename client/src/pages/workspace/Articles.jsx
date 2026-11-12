import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useOutletContext, useSearchParams } from 'react-router-dom';
import api from '../../api/axios.js';
import useRequest from '../../hooks/useRequest.js';
import PageMeta from '../../components/common/PageMeta.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import ErrorMessage from '../../components/common/ErrorMessage.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Icon from '../../components/common/Icon.jsx';
import DeletePostDialog from '../../components/post/DeletePostDialog.jsx';
import { TagList } from '../../components/post/TagPill.jsx';
import { describeError } from '../../utils/apiError.js';
import { formatDate, plural } from '../../utils/format.js';
import { articlePath, workspacePath } from '../../utils/publication.js';
import SiteLink from '../../components/publication/SiteLink.jsx';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
];

// Every article of THIS publication (drafts included), with status filters, publish/unpublish,
// edit and delete. Data comes from the owner-only endpoint, so it is always publication-specific.
export default function Articles() {
  const { publication, reloadPublication } = useOutletContext();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('status')) ? params.get('status') : 'all';
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(location.state?.notice ? { type: 'success', text: location.state.notice } : null);
  const messageRef = useRef(null);

  useEffect(() => {
    if (message) messageRef.current?.focus();
  }, [message]);

  const { status, data: posts, error, reload, setData } = useRequest(
    (signal) => api.get(`/publications/${publication.slug}/manage/posts`, { signal }).then((r) => r.data.posts),
    [publication.slug]
  );

  const counts = posts && { all: posts.length, published: posts.filter((p) => p.status === 'published').length, draft: posts.filter((p) => p.status === 'draft').length };
  const visible = posts ? (tab === 'all' ? posts : posts.filter((p) => p.status === tab)) : [];
  const selectTab = (id) => setParams(id === 'all' ? {} : { status: id }, { replace: true });

  const setStatus = async (post, nextStatus) => {
    setBusyId(post._id);
    try {
      const { data } = await api.put(`/posts/${post._id}`, { status: nextStatus });
      setData((current) => current.map((p) => (p._id === post._id ? { ...p, status: data.post.status, updatedAt: data.post.updatedAt } : p)));
      setMessage({ type: 'success', text: nextStatus === 'published' ? `"${post.title}" is now published.` : `"${post.title}" was moved back to drafts. It is no longer public.` });
      reloadPublication();
    } catch (err) {
      setMessage({ type: 'error', text: describeError(err).message });
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleted = (post) => {
    setDeleting(null);
    setData((current) => current.filter((p) => p._id !== post._id));
    setMessage({ type: 'success', text: `"${post.title}" was deleted.` });
    reloadPublication();
  };

  return (
    <section>
      <PageMeta title={`Articles in ${publication.name}`} />
      <header className="page-heading">
        <div>
          <p className="eyebrow">{publication.name}</p>
          <h1>{tab === 'draft' ? 'Drafts' : 'Articles'}</h1>
          <p>Drafts are private. Published articles appear on your publication&apos;s website.</p>
        </div>
        <Link to={workspacePath(publication.slug, 'write')} className="btn btn-primary">
          <Icon name="plus" size={16} />
          New article
        </Link>
      </header>

      {message && (
        <div className={`alert alert-${message.type}`} role={message.type === 'error' ? 'alert' : 'status'} tabIndex={-1} ref={messageRef}>
          <Icon name={message.type === 'error' ? 'circle-alert' : 'circle-check'} />
          <div className="alert-body">
            <p>{message.text}</p>
          </div>
          <button type="button" className="icon-button alert-dismiss" aria-label="Dismiss message" onClick={() => setMessage(null)}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {status === 'loading' && !posts && <LoadingSpinner label="Loading articles…" />}
      {status === 'error' && <ErrorMessage message={describeError(error).message} onRetry={reload} />}

      {posts && posts.length === 0 && (
        <EmptyState icon="square-pen" title="No articles in this publication yet" action={<Link to={workspacePath(publication.slug, 'write')} className="btn btn-primary">Write the first article</Link>}>
          Start a draft in Markdown, preview it, and publish when it reads right.
        </EmptyState>
      )}

      {posts && posts.length > 0 && (
        <>
          <div className="tabs" role="tablist" aria-label="Filter articles by status">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="articles-panel" className="tab" onClick={() => selectTab(t.id)}>
                {t.label}
                <span className="tab-count">{counts[t.id]}</span>
              </button>
            ))}
          </div>

          <div id="articles-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
            {visible.length === 0 ? (
              <EmptyState icon={tab === 'draft' ? 'file-text' : 'eye'} title={tab === 'draft' ? 'No drafts' : 'Nothing published yet'}>
                {tab === 'draft' ? `All ${plural(counts.published, 'article')} in this publication are published.` : `You have ${plural(counts.draft, 'draft')}. Publish one to show it on your website.`}
              </EmptyState>
            ) : (
              <ul className="manage-list" aria-label="Articles">
                {visible.map((post) => (
                  <li key={post._id} className="manage-item">
                    <div className="manage-item-main">
                      <div className="manage-item-top">
                        <span className={`status-badge status-${post.status}`}>{post.status === 'published' ? 'Published' : 'Draft'}</span>
                        <span className="manage-item-dates">
                          {post.author?.name ? `${post.author.name} · ` : ''}Updated {formatDate(post.updatedAt)}
                        </span>
                      </div>
                      <h2 className="manage-item-title">
                        <Link to={`/publications/${publication.slug}/editor/${post._id}`}>{post.title}</Link>
                      </h2>
                      <TagList tags={post.tags} label={`Tags for ${post.title}`} />
                    </div>
                    <div className="manage-item-actions">
                      {post.status === 'published' ? (
                        <>
                          <SiteLink to={articlePath(publication.slug, post.slug)} className="btn btn-ghost" aria-label={`View ${post.title}`}>
                            <Icon name="eye" size={16} />
                            <span aria-hidden="true">View</span>
                          </SiteLink>
                          <button type="button" className="btn btn-ghost" onClick={() => setStatus(post, 'draft')} disabled={busyId === post._id}>
                            {busyId === post._id ? 'Saving…' : 'Unpublish'}
                          </button>
                        </>
                      ) : (
                        <button type="button" className="btn btn-ghost" onClick={() => setStatus(post, 'published')} disabled={busyId === post._id}>
                          {busyId === post._id ? 'Publishing…' : 'Publish'}
                        </button>
                      )}
                      <Link to={`/publications/${publication.slug}/editor/${post._id}`} className="btn btn-secondary" aria-label={`Edit ${post.title}`}>
                        <Icon name="pencil" size={16} />
                        <span aria-hidden="true">Edit</span>
                      </Link>
                      <button type="button" className="btn btn-ghost btn-ghost-danger" onClick={() => setDeleting(post)} aria-label={`Delete ${post.title}`}>
                        <Icon name="trash-2" size={16} />
                        <span aria-hidden="true">Delete</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {deleting && <DeletePostDialog post={deleting} onCancel={() => setDeleting(null)} onDeleted={handleDeleted} />}
    </section>
  );
}
