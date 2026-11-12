import { Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/axios.js';
import lazyWithReload from '../../utils/lazyWithReload.js';
import useAuth from '../../hooks/useAuth.js';
import useRequest from '../../hooks/useRequest.js';
import PageMeta from '../../components/common/PageMeta.jsx';
import Avatar from '../../components/common/Avatar.jsx';
import CoverImage from '../../components/common/CoverImage.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import { useSite } from '../../components/publication/siteContext.js';
import { formatDate, wasEdited } from '../../utils/format.js';

const MarkdownRenderer = lazyWithReload(() => import('../../components/post/MarkdownRenderer.jsx'));

// One published article, inside its publication's website. The server only returns it if it is
// published AND belongs to this publication.
export default function PubArticle() {
  const { postSlug } = useParams();
  const { base, publication } = useSite();
  const { user } = useAuth();
  const { status, data: post, error, reload } = useRequest(
    (signal) => api.get(`/publications/${publication.slug}/posts/${encodeURIComponent(postSlug)}`, { signal }).then((r) => r.data.post),
    [publication.slug, postSlug]
  );

  if (status === 'loading' && !post) return <LoadingSpinner label="Loading article…" />;
  if (status === 'error') {
    const missing = error.response?.status === 404;
    return (
      <div className="pub-container pub-message">
        <PageMeta title={missing ? 'Article not found' : publication.name} />
        <h1>{missing ? 'Article not found' : 'This article could not be loaded'}</h1>
        <p>{missing ? 'It may have been unpublished or removed, or the link may be mistyped.' : 'Please try again in a moment.'}</p>
        <div className="pub-message-actions">
          {!missing && (
            <button type="button" className="pub-button" onClick={reload}>
              Try again
            </button>
          )}
          <Link to={base || '/'} className="pub-button pub-button-quiet">
            All articles in {publication.name}
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user && post.author && user._id === post.author._id;

  return (
    <article className="pub-article">
      <PageMeta title={`${post.title} | ${publication.name}`} description={post.excerpt || undefined} />
      <header className="pub-container pub-article-head">
        <p className="pub-article-kicker">
          <Link to={base || '/'}>{publication.name}</Link>
        </p>
        <h1>{post.title}</h1>
        <div className="pub-article-meta">
          {post.author && (
            <Link to={`/profile/${post.author._id}`} className="pub-author">
              <Avatar key={post.author.avatarUrl} user={post.author} />
              <span>{post.author.name}</span>
            </Link>
          )}
          <span>
            <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
            {wasEdited(post.createdAt, post.updatedAt) && (
              <>
                {' · '}Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
              </>
            )}
          </span>
          {isOwner && (
            <Link to={`/publications/${publication.slug}/editor/${post._id}`} className="pub-manage">
              Edit article
            </Link>
          )}
        </div>
      </header>
      {post.coverImage && (
        <div className="pub-container pub-article-cover">
          <CoverImage key={post.coverImage} src={post.coverImage} eager />
        </div>
      )}
      <div className="pub-container pub-reading">
        <Suspense fallback={<LoadingSpinner label="Preparing article…" />}>
          <MarkdownRenderer content={post.content} />
        </Suspense>
        {post.tags?.length > 0 && (
          <ul className="pub-article-tags" aria-label="Topics">
            {post.tags.map((t) => (
              <li key={t._id}>
                <Link to={`${base}/?tag=${t.slug}`}>#{t.name}</Link>
              </li>
            ))}
          </ul>
        )}
        {post.author && (
          <aside className="pub-author-card" aria-label="About the author">
            <Avatar key={post.author.avatarUrl} user={post.author} />
            <div>
              <p className="pub-author-label">Written by</p>
              <p className="pub-author-name">
                <Link to={`/profile/${post.author._id}`}>{post.author.name}</Link>
              </p>
              {post.author.bio && <p className="pub-author-bio">{post.author.bio}</p>}
            </div>
          </aside>
        )}
      </div>
    </article>
  );
}
