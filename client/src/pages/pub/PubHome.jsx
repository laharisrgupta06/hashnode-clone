import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axios.js';
import useAuth from '../../hooks/useAuth.js';
import useRequest from '../../hooks/useRequest.js';
import PageMeta from '../../components/common/PageMeta.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import CoverImage from '../../components/common/CoverImage.jsx';
import { useSite } from '../../components/publication/siteContext.js';
import { formatDate } from '../../utils/format.js';
import { workspacePath } from '../../utils/publication.js';

// A publication's homepage: identity, topic filter and its PUBLISHED articles (list or grid).
export default function PubHome() {
  const { base, publication, tags } = useSite();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tag = params.get('tag') ?? '';
  const activeTag = tags.find((t) => t.slug === tag);
  const { status, data: posts, reload } = useRequest(
    (signal) => api.get(`/publications/${publication.slug}/posts`, { params: tag ? { tag } : {}, signal }).then((r) => r.data.posts),
    [publication.slug, tag]
  );
  const isOwner = user && publication.owner && user._id === publication.owner._id;

  return (
    <>
      <PageMeta title={activeTag ? `#${activeTag.name} on ${publication.name}` : publication.name} description={publication.description || publication.tagline || undefined} />
      {publication.coverImage && (
        <div className="pub-cover">
          <CoverImage key={publication.coverImage} src={publication.coverImage} eager />
        </div>
      )}
      <section className="pub-container pub-intro">
        <h1>{publication.name}</h1>
        {publication.tagline && <p className="pub-tagline">{publication.tagline}</p>}
        {publication.description && <p className="pub-description">{publication.description}</p>}
        {publication.owner && (
          <p className="pub-byline">
            By <Link to={`/profile/${publication.owner._id}`}>{publication.owner.name}</Link>
          </p>
        )}
      </section>

      <section className="pub-container pub-articles" aria-labelledby="pub-articles-title">
        <div className="pub-articles-head">
          <h2 id="pub-articles-title">{activeTag ? `Articles tagged #${activeTag.name}` : 'Articles'}</h2>
          {tags.length > 0 && (
            <nav className="pub-topics" aria-label="Filter by topic">
              <button type="button" className={`pub-topic${!tag ? ' active' : ''}`} aria-pressed={!tag} onClick={() => setParams({}, { replace: true })}>
                All
              </button>
              {tags.map((t) => (
                <button key={t._id} type="button" className={`pub-topic${tag === t.slug ? ' active' : ''}`} aria-pressed={tag === t.slug} onClick={() => setParams({ tag: t.slug }, { replace: true })}>
                  #{t.name}
                </button>
              ))}
            </nav>
          )}
        </div>

        {status === 'loading' && !posts && <LoadingSpinner label="Loading articles…" />}
        {status === 'error' && (
          <p className="pub-note">
            Articles could not be loaded.{' '}
            <button type="button" className="pub-link-button" onClick={reload}>
              Try again
            </button>
          </p>
        )}
        {posts && posts.length === 0 && (
          <div className="pub-empty">
            <p>{tag ? 'No published articles with this topic.' : 'No articles have been published here yet.'}</p>
            {isOwner && !tag && (
              <Link to={workspacePath(publication.slug, 'write')} className="pub-button">
                Write the first article
              </Link>
            )}
          </div>
        )}
        {posts && posts.length > 0 && (
          <ul className={`pub-post-list layout-${publication.appearance.layout}`}>
            {posts.map((post) => (
              <li key={post._id}>
                <article className="pub-post">
                  {publication.appearance.layout === 'grid' && post.coverImage && (
                    <div className="pub-post-cover">
                      <CoverImage key={post.coverImage} src={post.coverImage} />
                    </div>
                  )}
                  <p className="pub-post-meta">
                    <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
                    {post.author && <span> · {post.author.name}</span>}
                  </p>
                  <h3>
                    <Link to={`${base}/${post.slug}`}>{post.title}</Link>
                  </h3>
                  {post.excerpt && <p className="pub-post-excerpt">{post.excerpt}</p>}
                  {post.tags?.length > 0 && <p className="pub-post-tags">{post.tags.map((t) => `#${t.name}`).join('  ')}</p>}
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
