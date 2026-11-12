import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/axios.js';
import useRequest from '../hooks/useRequest.js';
import PageMeta from '../components/common/PageMeta.jsx';
import PostList from '../components/post/PostList.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Icon from '../components/common/Icon.jsx';
import PublicationMark from '../components/publication/PublicationMark.jsx';
import { describeError } from '../utils/apiError.js';
import { plural } from '../utils/format.js';
import { publicationPath } from '../utils/publication.js';

const SEARCH_DELAY_MS = 300;

// Explore (PRD 2.1.D public feed): publications on DevPress, and published articles from all of them,
// newest first, searchable by title. The search term lives in the URL: /explore?q=react
export default function Explore() {
  const [params, setParams] = useSearchParams();
  const query = (params.get('q') ?? '').trim();
  const [input, setInput] = useState(params.get('q') ?? '');

  useEffect(() => setInput(params.get('q') ?? ''), [params]);

  useEffect(() => {
    const clean = input.trim();
    if (clean === query) return undefined;
    const timer = setTimeout(() => setParams(clean ? { q: clean } : {}, { replace: true }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [input, query, setParams]);

  const pubs = useRequest((signal) => api.get('/publications', { signal }).then((r) => r.data.publications), []);
  const { status: loadStatus, data: posts, error, reload } = useRequest(
    (signal) => api.get('/posts', { params: query ? { search: query } : {}, signal }).then((res) => res.data.posts),
    [query]
  );

  const clearSearch = () => {
    setInput('');
    setParams({}, { replace: true });
  };

  return (
    <section>
      <PageMeta title={query ? `Search: ${query}` : 'Explore'} description="Browse publications and the latest technical articles on DevPress." />
      <header className="page-heading">
        <div>
          <p className="eyebrow">Explore</p>
          <h1>{query ? 'Search results' : 'Publications and articles'}</h1>
          <p>Every publication on DevPress, and the latest articles they have published.</p>
        </div>
      </header>

      {!query && pubs.data && pubs.data.length > 0 && (
        <section className="explore-pubs" aria-labelledby="explore-pubs-title">
          <h2 id="explore-pubs-title" className="section-title">
            Publications
          </h2>
          <ul className="pub-strip">
            {pubs.data.map((pub) => (
              <li key={pub._id}>
                <Link to={publicationPath(pub.slug)} className="pub-strip-item">
                  <PublicationMark publication={pub} size={36} />
                  <span>
                    <strong>{pub.name}</strong>
                    <small>{plural(pub.publishedCount, 'article')}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="section-title">{query ? `Articles matching "${query}"` : 'Latest articles'}</h2>
      <form className="search-field" role="search" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="feed-search" className="visually-hidden">
          Search articles by title
        </label>
        <Icon name="search" size={18} />
        <input id="feed-search" type="search" placeholder="Search articles by title" value={input} onChange={(event) => setInput(event.target.value)} />
      </form>

      {loadStatus === 'error' && <ErrorMessage message={describeError(error).message} onRetry={reload} />}
      {loadStatus === 'loading' && !posts && <LoadingSpinner label="Loading articles…" />}

      {posts && (
        <div aria-busy={loadStatus === 'loading'} className={loadStatus === 'loading' ? 'is-refreshing' : undefined}>
          {query && (
            <p className="result-count" role="status">
              {plural(posts.length, 'result')} for &ldquo;{query}&rdquo;
            </p>
          )}
          {posts.length > 0 && <PostList posts={posts} label={query ? `Search results for ${query}` : 'Latest articles'} />}
          {posts.length === 0 && query && (
            <EmptyState icon="search" title={`No articles match "${query}"`} action={<button type="button" className="btn btn-secondary" onClick={clearSearch}>Clear search</button>}>
              Search looks at article titles. Try a shorter or different word.
            </EmptyState>
          )}
          {posts.length === 0 && !query && (
            <EmptyState icon="newspaper" title="No articles published yet" action={<Link to="/publications" className="btn btn-primary">Go to my publications</Link>}>
              Published articles from every publication appear here, newest first.
            </EmptyState>
          )}
        </div>
      )}
    </section>
  );
}
