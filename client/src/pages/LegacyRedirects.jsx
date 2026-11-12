import { Link, Navigate, useParams } from 'react-router-dom';
import api from '../api/axios.js';
import useRequest from '../hooks/useRequest.js';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import PageMeta from '../components/common/PageMeta.jsx';
import { describeError } from '../utils/apiError.js';
import { articlePath } from '../utils/publication.js';

// Addresses from before publications existed keep working by forwarding to their new home.

// /post/:slug -> /p/<publication>/<slug>
export function LegacyPostRedirect() {
  const { slug } = useParams();
  const { status, data: post, error, reload } = useRequest((signal) => api.get(`/posts/${encodeURIComponent(slug)}`, { signal }).then((r) => r.data.post), [slug]);
  if (status === 'loading') return <LoadingSpinner label="Opening article…" />;
  if (status === 'error') {
    if (error.response?.status === 404) {
      return (
        <EmptyState title="Article not found" action={<Link to="/explore" className="btn btn-primary">Explore articles</Link>}>
          It may have been deleted or unpublished.
          <PageMeta title="Article not found" />
        </EmptyState>
      );
    }
    return <ErrorMessage message={describeError(error).message} onRetry={reload} />;
  }
  return <Navigate to={articlePath(post.publication.slug, post.slug)} replace />;
}

// /editor/:id -> /publications/<publication>/editor/:id (owner only; the server checks)
export function LegacyEditorRedirect() {
  const { id } = useParams();
  const { status, data: post, error, reload } = useRequest((signal) => api.get(`/posts/id/${encodeURIComponent(id)}`, { signal }).then((r) => r.data.post), [id]);
  if (status === 'loading') return <LoadingSpinner label="Opening editor…" />;
  if (status === 'error') {
    const code = error.response?.status;
    if (code === 403 || code === 404 || code === 400) {
      return (
        <EmptyState title={code === 403 ? 'You can only edit your own articles' : 'Article not found'} action={<Link to="/publications" className="btn btn-primary">Go to my publications</Link>}>
          {code === 403 ? 'This article belongs to another author.' : 'It may have been deleted.'}
          <PageMeta title={code === 403 ? 'Not allowed' : 'Article not found'} />
        </EmptyState>
      );
    }
    return <ErrorMessage message={describeError(error).message} onRetry={reload} />;
  }
  return <Navigate to={`/publications/${post.publication.slug}/editor/${post._id}`} replace />;
}
