import { Link, useParams } from 'react-router-dom';
import api from '../api/axios.js';
import useRequest from '../hooks/useRequest.js';
import PageMeta from '../components/common/PageMeta.jsx';
import PostList from '../components/post/PostList.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { describeError } from '../utils/apiError.js';
import { plural } from '../utils/format.js';

// Published articles under one tag (PRD 2.1.C). The server answers 404 both for unknown tags and for
// tags with no published articles, so draft-only tags stay invisible.
export default function TagPage() {
  const { slug } = useParams();
  const { status, data, error, reload } = useRequest(
    (signal) => api.get(`/tags/${encodeURIComponent(slug)}/posts`, { signal }).then((res) => res.data),
    [slug]
  );

  const notFound = status === 'error' && error.response?.status === 404;

  return (
    <section>
      <PageMeta title={data ? `#${data.tag.name}` : 'Tag'} description={data ? `Articles tagged ${data.tag.name} on DevPress.` : undefined} />

      {status === 'loading' && !data && <LoadingSpinner label="Loading articles…" />}

      {notFound && (
        <EmptyState icon="tag" title="No articles under this tag" action={<Link to="/tags" className="btn btn-secondary">Browse all tags</Link>}>
          This tag does not exist or has no published articles yet.
        </EmptyState>
      )}
      {status === 'error' && !notFound && <ErrorMessage message={describeError(error).message} onRetry={reload} />}

      {data && (
        <>
          <header className="page-heading">
            <div>
              <p className="eyebrow">Tag</p>
              <h1>#{data.tag.name}</h1>
              <p>{plural(data.posts.length, 'published article')}</p>
            </div>
            <Link to="/tags" className="btn btn-secondary">
              All tags
            </Link>
          </header>
          <PostList posts={data.posts} label={`Articles tagged ${data.tag.name}`} />
        </>
      )}
    </section>
  );
}
