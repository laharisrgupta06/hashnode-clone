import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios.js';
import useRequest from '../hooks/useRequest.js';
import PageMeta from '../components/common/PageMeta.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Icon from '../components/common/Icon.jsx';
import DeletePostDialog from '../components/post/DeletePostDialog.jsx';
import SiteLink from '../components/publication/SiteLink.jsx';
import { describeError } from '../utils/apiError.js';
import { formatDate, plural, publishedDate } from '../utils/format.js';
import { articlePath, workspacePath } from '../utils/publication.js';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
];

// Most recently changed first, like a publication's own Articles page.
const byUpdated = (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt);

// Loads MY articles (GET /posts/mine: the server takes the user from the token, never from us)
// and my publications (to tell "no publication yet" apart from "no articles yet").
const fetchDashboard = (signal) =>
  Promise.all([api.get('/posts/mine', { signal }), api.get('/publications/mine', { signal })]).then(([posts, pubs]) => ({
    posts: posts.data.posts.slice().sort(byUpdated),
    publications: pubs.data.publications,
  }));

// The consolidated dashboard (PRD 2.1.E): every article I wrote, across all my publications,
// drafts included, with quick actions. Each publication keeps its own Articles page as well.
export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('status')) ? params.get('status') : 'all';
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);
  const messageRef = useRef(null);

  // Counts local changes (Publish, Unpublish, Delete). It goes up when a change STARTS and again when
  // it FINISHES, so a load that overlapped any part of a change sees a different number when it
  // returns. Such an answer may predate the change: it is thrown away and the list fetched again,
  // so an old response can never overwrite a newer state.
  const changes = useRef(0);
  const markChange = () => {
    changes.current += 1;
  };
  const loadDashboard = useCallback(async (signal) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const seen = changes.current;
      const result = await fetchDashboard(signal);
      if (changes.current === seen) return result;
    }
    return fetchDashboard(signal); // changes kept arriving: this last answer is still newer than all of them
  }, []);
  const { status, data, error, reload, setData } = useRequest(loadDashboard, []);

  useEffect(() => {
    if (message) messageRef.current?.focus();
  }, [message]);

  // Edit and workspace links open a new tab; refresh when the writer comes back to this one.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  const posts = data?.posts;
  const counts = posts && { all: posts.length, published: posts.filter((p) => p.status === 'published').length, draft: posts.filter((p) => p.status === 'draft').length };
  const visible = posts ? (tab === 'all' ? posts : posts.filter((p) => p.status === tab)) : [];
  const selectTab = (id) => setParams(id === 'all' ? {} : { status: id }, { replace: true });
  const replacePost = (updated) => setData((current) => ({ ...current, posts: current.posts.map((p) => (p._id === updated._id ? { ...p, ...updated } : p)) }));

  const setStatus = async (post, nextStatus) => {
    setBusyId(post._id);
    markChange();
    try {
      const { data: result } = await api.put(`/posts/${post._id}`, { status: nextStatus });
      replacePost({ _id: post._id, status: result.post.status, publishedAt: result.post.publishedAt, updatedAt: result.post.updatedAt });
      setMessage({ type: 'success', text: nextStatus === 'published' ? `"${post.title}" is now published.` : `"${post.title}" was moved back to drafts. It is no longer public.` });
    } catch (err) {
      setMessage({ type: 'error', text: describeError(err).message });
    } finally {
      markChange();
      setBusyId(null);
    }
  };

  // The delete request itself runs inside DeletePostDialog: count the change from the moment the
  // dialog opens until the server confirmed the deletion.
  const askDelete = (post) => {
    markChange();
    setDeleting(post);
  };

  const handleDeleted = (post) => {
    markChange();
    setDeleting(null);
    setData((current) => ({ ...current, posts: current.posts.filter((p) => p._id !== post._id) }));
    setMessage({ type: 'success', text: `"${post.title}" was deleted.` });
  };

  const firstPub = data?.publications?.[0];

  return (
    <section>
      <PageMeta title="Dashboard" />
      <header className="page-heading">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Dashboard</h1>
          <p>All your articles across every publication. Drafts are private; published articles are on their publication&apos;s website.</p>
        </div>
        <Link to="/publications" className="btn btn-secondary">
          <Icon name="layout-dashboard" size={16} />
          My publications
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

      {status === 'loading' && !data && <LoadingSpinner label="Loading your articles…" />}
      {status === 'error' && <ErrorMessage message={describeError(error).message} onRetry={reload} />}

      {data && data.publications.length === 0 && posts.length === 0 && (
        <EmptyState icon="newspaper" title="You have no publications yet" action={<Link to="/publications/new" className="btn btn-primary">Create your publication</Link>}>
          Articles live inside a publication. Create one, then write your first article in it.
        </EmptyState>
      )}

      {data && data.publications.length > 0 && posts.length === 0 && (
        <EmptyState icon="square-pen" title="No articles yet" action={<SiteLink to={workspacePath(firstPub.slug, 'write')} className="btn btn-primary">Write in {firstPub.name}</SiteLink>}>
          Your drafts and published articles from every publication will be listed here.
        </EmptyState>
      )}

      {posts && posts.length > 0 && (
        <>
          <div className="tabs" role="tablist" aria-label="Filter articles by status">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="dashboard-panel" className="tab" onClick={() => selectTab(t.id)}>
                {t.label}
                <span className="tab-count">{counts[t.id]}</span>
              </button>
            ))}
          </div>

          <div id="dashboard-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
            {visible.length === 0 ? (
              <EmptyState icon={tab === 'draft' ? 'file-text' : 'eye'} title={tab === 'draft' ? 'No drafts' : 'Nothing published yet'}>
                {tab === 'draft' ? `All ${plural(counts.published, 'article')} are published.` : `You have ${plural(counts.draft, 'draft')}. Publish one to show it on its publication's website.`}
              </EmptyState>
            ) : (
              <ul className="manage-list" aria-label="Your articles">
                {visible.map((post) => {
                  const pub = post.publication;
                  const editPath = workspacePath(pub.slug, `editor/${post._id}`);
                  const busy = busyId === post._id;
                  return (
                    <li key={post._id} className="manage-item">
                      <div className="manage-item-main">
                        <div className="manage-item-top">
                          <span className={`status-badge status-${post.status}`}>{post.status === 'published' ? 'Published' : 'Draft'}</span>
                          <SiteLink to={workspacePath(pub.slug)} className="manage-item-pub" aria-label={`Open the ${pub.name} workspace`}>
                            {pub.name}
                          </SiteLink>
                          <span className="manage-item-dates">
                            {post.status === 'published' ? (
                              <>
                                Published <time dateTime={publishedDate(post)}>{formatDate(publishedDate(post))}</time>
                              </>
                            ) : (
                              <>
                                Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
                              </>
                            )}
                          </span>
                        </div>
                        <h2 className="manage-item-title">
                          <SiteLink to={editPath}>{post.title}</SiteLink>
                        </h2>
                      </div>
                      <div className="manage-item-actions">
                        {post.status === 'published' ? (
                          <>
                            <SiteLink to={articlePath(pub.slug, post.slug)} className="btn btn-ghost" aria-label={`View ${post.title}`}>
                              <Icon name="eye" size={16} />
                              <span aria-hidden="true">View</span>
                            </SiteLink>
                            <button type="button" className="btn btn-ghost" onClick={() => setStatus(post, 'draft')} disabled={busy}>
                              {busy ? 'Saving…' : 'Unpublish'}
                            </button>
                          </>
                        ) : (
                          <button type="button" className="btn btn-ghost" onClick={() => setStatus(post, 'published')} disabled={busy}>
                            {busy ? 'Publishing…' : 'Publish'}
                          </button>
                        )}
                        <SiteLink to={editPath} className="btn btn-secondary" aria-label={`Edit ${post.title}`}>
                          <Icon name="pencil" size={16} />
                          <span aria-hidden="true">Edit</span>
                        </SiteLink>
                        <button type="button" className="btn btn-ghost btn-ghost-danger" onClick={() => askDelete(post)} aria-label={`Delete ${post.title}`}>
                          <Icon name="trash-2" size={16} />
                          <span aria-hidden="true">Delete</span>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {deleting && <DeletePostDialog post={deleting} onCancel={() => setDeleting(null)} onDeleted={handleDeleted} />}
    </section>
  );
}
