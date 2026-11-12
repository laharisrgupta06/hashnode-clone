import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useBlocker, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import api from '../api/axios.js';
import lazyWithReload from '../utils/lazyWithReload.js';
import useAuth from '../hooks/useAuth.js';
import useRequest from '../hooks/useRequest.js';
import PageMeta from '../components/common/PageMeta.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import Icon from '../components/common/Icon.jsx';
import MarkdownEditor from '../components/editor/MarkdownEditor.jsx';
import TypewriterDesk from '../components/editor/typewriter/TypewriterDesk.jsx';
import TagInput from '../components/editor/TagInput.jsx';
import DeletePostDialog from '../components/post/DeletePostDialog.jsx';
import { validatePost, isHttpUrl } from '../utils/validation.js';
import { describeError } from '../utils/apiError.js';
import { formatDate, formatDateTime } from '../utils/format.js';
import { readBackup, writeBackup, clearBackup } from '../utils/draftBackup.js';
import { articlePath, workspacePath } from '../utils/publication.js';
import SiteLink from '../components/publication/SiteLink.jsx';

// Same safe renderer as the article page, so the preview matches what readers will see.
const MarkdownRenderer = lazyWithReload(() => import('../components/post/MarkdownRenderer.jsx'));

const EMPTY = { title: '', content: '', coverImage: '', tags: [] };
const fieldsOf = (post) => ({ title: post.title, content: post.content, coverImage: post.coverImage ?? '', tags: post.tags.map((t) => t.name) });
const sameFields = (a, b) => a.title === b.title && a.content === b.content && a.coverImage === b.coverImage && a.tags.join('\n') === b.tags.join('\n');

// Which writing surface opens: the last one the writer chose (typewriter or document), on this device.
// Phones start with the document, where the text is large enough to read.
const VIEW_KEY = 'devpress:editor-surface';
function initialView() {
  try {
    const stored = window.localStorage.getItem(VIEW_KEY);
    if (stored === 'typewriter' || stored === 'write') return stored;
  } catch {
    /* storage unavailable: use the default */
  }
  return typeof window !== 'undefined' && window.innerWidth < 640 ? 'write' : 'typewriter';
}

// Loads the post being edited (owner only), or nothing for a new article.
function useEditablePost(id) {
  return useRequest((signal) => (id ? api.get(`/posts/id/${encodeURIComponent(id)}`, { signal }).then((res) => res.data.post) : Promise.resolve(null)), [id]);
}

// The article editor, inside a publication's workspace: /publications/:slug/write (new) and
// /publications/:slug/editor/:id (edit). The publication comes from the workspace (owner-checked).
export default function PostEditor() {
  const { id } = useParams();
  const { publication } = useOutletContext();
  const { status, data: loaded, error, reload } = useEditablePost(id);

  if (status === 'loading' && id) return <LoadingSpinner label="Loading article…" />;

  if (status === 'error') {
    const code = error.response?.status;
    if (code === 403) {
      return (
        <EmptyState icon="circle-alert" title="You can only edit your own articles" action={<Link to={workspacePath(publication.slug, 'articles')} className="btn btn-primary">Back to articles</Link>}>
          This article belongs to another author.
          <PageMeta title="Not allowed" />
        </EmptyState>
      );
    }
    if (code === 404 || code === 400) {
      return (
        <EmptyState title="Article not found" action={<Link to={workspacePath(publication.slug, 'articles')} className="btn btn-primary">Back to articles</Link>}>
          It may have been deleted, or the link is mistyped.
          <PageMeta title="Article not found" />
        </EmptyState>
      );
    }
    return <ErrorMessage message={describeError(error).message} onRetry={reload} />;
  }

  // An article is always edited inside ITS publication's workspace.
  if (loaded && loaded.publication?.slug && loaded.publication.slug !== publication.slug) {
    return <Navigate to={`/publications/${loaded.publication.slug}/editor/${loaded._id}`} replace />;
  }

  // key: a different article (or new vs existing) gets a completely fresh editor state.
  return <EditorForm key={id ?? `new-${publication._id}`} id={id} initialPost={loaded} />;
}

function EditorForm({ id, initialPost }) {
  const { user } = useAuth();
  const { publication, reloadPublication } = useOutletContext();
  // Local backups are per article, and per publication for a new article.
  const backupKey = id ?? `new-${publication._id}`;
  const navigate = useNavigate();
  const location = useLocation();

  const [post, setPost] = useState(initialPost); // the server's version (null until first save)
  const [saved, setSaved] = useState(initialPost ? fieldsOf(initialPost) : EMPTY);
  const [values, setValues] = useState(saved);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(null); // 'draft' | 'published' while a save runs
  const [message, setMessage] = useState(location.state?.message ?? null); // { type, text, link? }
  const [view, setView] = useState(initialView); // 'typewriter' | 'write' (the full document) | 'preview' | 'split'
  const [coverFailed, setCoverFailed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [backup, setBackup] = useState(null);
  const allowNavigation = useRef(false);
  const titleRef = useRef(null);

  const dirty = !sameFields(values, saved);
  const savedStatus = post?.status ?? 'draft';

  // Existing tags as suggestions (only tags used by published articles are listed by the server).
  const { data: tagSuggestions } = useRequest((signal) => api.get('/tags', { signal }).then((res) => res.data.tags.map((t) => t.name)), []);

  // ----- Local backup: offer recovery once, on open -----
  useEffect(() => {
    const found = readBackup(user._id, backupKey);
    if (!found) return;
    const matchesServer = !id || found.baseUpdatedAt === initialPost?.updatedAt;
    if (matchesServer && !sameFields(found.values, saved)) setBackup(found);
    else clearBackup(user._id, backupKey); // stale (the article changed on the server since) or identical
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the editor opens
  }, []);

  // While there are unsaved changes, keep a local safety copy (debounced).
  useEffect(() => {
    if (!dirty || backup) return undefined; // do not overwrite a backup the user has not decided on yet
    const timer = setTimeout(() => writeBackup(user._id, backupKey, { values, baseUpdatedAt: post?.updatedAt ?? null }), 800);
    return () => clearTimeout(timer);
  }, [dirty, values, backup, user._id, backupKey, post?.updatedAt]);

  // ----- Leaving with unsaved changes -----
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !allowNavigation.current && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = ''; // the browser shows its own "Leave site?" message
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // The title box grows with its text (wrapping titles stay fully visible, no inner scrollbar).
  useEffect(() => {
    const box = titleRef.current;
    if (!box) return;
    box.style.height = 'auto';
    box.style.height = `${box.scrollHeight}px`;
  }, [values.title]);

  const chooseView = (next) => {
    setView(next);
    if (next === 'typewriter' || next === 'write') {
      try {
        window.localStorage.setItem(VIEW_KEY, next);
      } catch {
        /* not remembered: fine */
      }
    }
  };

  const update = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    if (name === 'coverImage') setCoverFailed(false);
    setMessage(null);
  };

  // ----- Saving -----
  const save = useCallback(
    async (nextStatus) => {
      if (saving) return;
      const found = validatePost(values);
      setErrors(found);
      if (Object.keys(found).length > 0) {
        const first = Object.keys(found)[0];
        document.getElementById(first === 'content' ? 'post-content' : `post-${first}`)?.focus();
        if (first === 'content' && view === 'preview') setView('write');
        setMessage({ type: 'error', text: 'Please fix the highlighted fields.' });
        return;
      }

      setSaving(nextStatus);
      setMessage(null);
      const body = { title: values.title.trim(), content: values.content, coverImage: values.coverImage.trim(), tags: values.tags, status: nextStatus };
      if (!post) body.publication = publication._id; // the server checks this publication is the author's
      try {
        const { data } = post ? await api.put(`/posts/${post._id}`, body) : await api.post('/posts', body);
        const fresh = fieldsOf(data.post);
        clearBackup(user._id, backupKey);
        setPost(data.post);
        setSaved(fresh);
        setValues(fresh);
        const result =
          nextStatus === 'published'
            ? { type: 'success', text: savedStatus === 'published' ? 'Changes published.' : 'Article published.', link: articlePath(publication.slug, data.post.slug) }
            : { type: 'success', text: savedStatus === 'published' && post ? 'Article moved back to drafts. It is no longer public.' : 'Draft saved. Only you can see it.' };
        setMessage(result);
        reloadPublication(); // the workspace counts (published / drafts) change
        if (!post) {
          // First save of a new article: continue editing it at its own URL (the message travels along).
          clearBackup(user._id, `new-${publication._id}`);
          allowNavigation.current = true;
          navigate(`/publications/${publication.slug}/editor/${data.post._id}`, { replace: true, state: { message: result } });
        }
      } catch (err) {
        // 401 (session expired) is handled globally: the user is sent to log in, and the local
        // backup brings this text back afterwards.
        setMessage({ type: 'error', text: describeError(err).message });
      } finally {
        setSaving(null);
      }
    },
    [saving, values, view, post, user._id, backupKey, savedStatus, navigate, publication, reloadPublication]
  );

  const saveShortcut = () => save(savedStatus);

  const restoreBackup = () => {
    setValues(backup.values);
    setBackup(null);
  };
  const discardBackup = () => {
    clearBackup(user._id, backupKey);
    setBackup(null);
  };

  const handleDeleted = (deleted) => {
    clearBackup(user._id, backupKey);
    allowNavigation.current = true;
    reloadPublication();
    navigate(workspacePath(publication.slug, 'articles'), { state: { notice: `"${deleted.title}" was deleted.` } });
  };

  const coverUrl = values.coverImage.trim();
  const showCoverPreview = coverUrl && isHttpUrl(coverUrl);
  const pageTitle = useMemo(() => (post ? `Edit: ${post.title}` : 'Write an article'), [post]);

  return (
    <section className="editor-page">
      <PageMeta title={pageTitle} />

      <header className="editor-header">
        <div className="editor-header-text">
          <Link to={workspacePath(publication.slug, 'articles')} className="back-link">
            <Icon name="arrow-left" size={16} />
            Articles
          </Link>
          <p className="editor-status">
            <span className={`status-badge status-${savedStatus}`}>{post ? (savedStatus === 'published' ? 'Published' : 'Draft') : 'New article'}</span>
            <span className="editor-save-state" role="status">
              {saving ? 'Saving…' : dirty ? 'Unsaved changes' : post ? `Saved ${formatDate(post.updatedAt)}` : 'Not saved yet'}
            </span>
          </p>
        </div>
        <div className="editor-actions">
          {post && (
            <button type="button" className="btn btn-ghost btn-ghost-danger" onClick={() => setDeleting(true)}>
              <Icon name="trash-2" size={16} />
              <span className="label-wide-only">Delete</span>
              <span className="visually-hidden"> article</span>
            </button>
          )}
          {savedStatus === 'published' ? (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => save('draft')} disabled={Boolean(saving)}>
                {saving === 'draft' ? 'Saving…' : 'Unpublish'}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => save('published')} disabled={Boolean(saving) || !dirty}>
                {saving === 'published' ? 'Publishing…' : 'Update article'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => save('draft')} disabled={Boolean(saving)}>
                {saving === 'draft' ? 'Saving…' : 'Save draft'}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => save('published')} disabled={Boolean(saving)}>
                {saving === 'published' ? 'Publishing…' : 'Publish'}
              </button>
            </>
          )}
        </div>
      </header>

      {backup && (
        <div className="alert alert-info" role="status">
          <Icon name="info" />
          <div className="alert-body">
            <p>You have unsaved changes from {formatDateTime(backup.savedAt)} that were not saved to the server.</p>
            <div className="alert-actions">
              <button type="button" className="btn btn-primary" onClick={restoreBackup}>
                Restore them
              </button>
              <button type="button" className="btn btn-secondary" onClick={discardBackup}>
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className={`alert alert-${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
          <Icon name={message.type === 'error' ? 'circle-alert' : 'circle-check'} />
          <div className="alert-body">
            <p>
              {message.text}{' '}
              {message.link && (
                <SiteLink to={message.link}>
                  View article
                </SiteLink>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="editor-fields">
        <div className="field">
          <label htmlFor="post-title" className="visually-hidden">
            Title
          </label>
          <textarea
            id="post-title"
            ref={titleRef}
            className="title-input"
            rows={1}
            placeholder="Article title"
            value={values.title}
            onChange={(event) => update('title', event.target.value.replace(/\n/g, ' '))}
            onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()}
            aria-invalid={errors.title ? 'true' : 'false'}
            aria-describedby={errors.title ? 'title-error' : undefined}
          />
          {errors.title && (
            <p className="field-error" id="title-error">
              {errors.title}
            </p>
          )}
        </div>

        <div className="editor-meta-grid">
          <div className="field">
            <label htmlFor="post-coverImage">Cover image URL</label>
            <input
              id="post-coverImage"
              type="url"
              inputMode="url"
              placeholder="https://example.com/cover.jpg"
              value={values.coverImage}
              onChange={(event) => update('coverImage', event.target.value)}
              aria-invalid={errors.coverImage ? 'true' : 'false'}
              aria-describedby={['cover-hint', errors.coverImage && 'cover-error', coverFailed && 'cover-failed'].filter(Boolean).join(' ')}
            />
            <p className="field-hint" id="cover-hint">
              Optional. A link to an image, shown at the top of the article and on its card.
            </p>
            {errors.coverImage && (
              <p className="field-error" id="cover-error">
                {errors.coverImage}
              </p>
            )}
            {showCoverPreview && !coverFailed && <img className="cover-preview" src={coverUrl} alt="Cover image preview" referrerPolicy="no-referrer" onError={() => setCoverFailed(true)} />}
            {showCoverPreview && coverFailed && (
              <p className="field-error" id="cover-failed">
                This image could not be loaded. Check the address; readers would see no cover.
              </p>
            )}
          </div>

          <TagInput tags={values.tags} onChange={(tags) => update('tags', tags)} suggestions={tagSuggestions ?? []} />
        </div>

        <div className="editor-view-switch" role="group" aria-label="Editor view">
          {[
            ['typewriter', 'Typewriter', 'keyboard'],
            ['write', 'Document', 'pencil'],
            ['preview', 'Preview', 'eye'],
            ['split', 'Side by side', 'layout-dashboard'],
          ].map(([value, label, icon]) => (
            <button key={value} type="button" className={`view-button view-${value}`} aria-pressed={view === value} onClick={() => chooseView(value)}>
              <Icon name={icon} size={16} />
              {label}
            </button>
          ))}
        </div>

        {view === 'typewriter' ? (
          <div className="editor-pane editor-pane-typewriter">
            <TypewriterDesk
              value={values.content}
              onChange={(content) => update('content', content)}
              onSave={saveShortcut}
              onReview={() => {
                chooseView('write');
                // Show the start of the full document, just below the sticky headers (their height varies).
                setTimeout(() => {
                  const target = document.querySelector('.editor-view-switch');
                  const header = document.querySelector('.editor-header');
                  if (!target) return;
                  const below = header ? header.getBoundingClientRect().bottom : 0;
                  window.scrollTo({ top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - below - 12) });
                }, 0);
              }}
              invalid={Boolean(errors.content)}
              describedBy={errors.content ? 'content-error' : undefined}
            />
            {errors.content && (
              <p className="field-error" id="content-error">
                {errors.content}
              </p>
            )}
          </div>
        ) : (
        <div className={`editor-panes view-mode-${view}`}>
          <div className="editor-pane editor-pane-write">
            <MarkdownEditor
              value={values.content}
              onChange={(content) => update('content', content)}
              onSave={saveShortcut}
              invalid={Boolean(errors.content)}
              describedBy={errors.content ? 'content-error' : undefined}
            />
            {errors.content && (
              <p className="field-error" id="content-error">
                {errors.content}
              </p>
            )}
          </div>
          <div className="editor-pane editor-pane-preview" aria-label="Preview">
            {values.content.trim() ? (
              <Suspense fallback={<LoadingSpinner label="Preparing preview…" />}>
                {values.title.trim() && <h1 className="preview-title">{values.title}</h1>}
                <MarkdownRenderer content={values.content} />
              </Suspense>
            ) : (
              <p className="muted">Nothing to preview yet. Write some Markdown and it will appear here exactly as readers will see it.</p>
            )}
          </div>
        </div>
        )}
      </div>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Leave without saving?"
        confirmLabel="Leave page"
        danger
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      >
        <p>Your latest changes have not been saved to the server. A local copy is kept on this device, but other devices will not see it.</p>
      </ConfirmDialog>

      {deleting && post && <DeletePostDialog post={post} onCancel={() => setDeleting(false)} onDeleted={handleDeleted} />}
    </section>
  );
}
