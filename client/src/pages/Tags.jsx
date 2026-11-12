import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import useRequest from '../hooks/useRequest.js';
import PageMeta from '../components/common/PageMeta.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { describeError } from '../utils/apiError.js';
import { plural } from '../utils/format.js';

// All tags with how many PUBLISHED articles use each (PRD 2.1.C). The server already leaves out
// tags that only drafts use, and sorts by most used.
export default function Tags() {
  const { status, data: tags, error, reload } = useRequest((signal) => api.get('/tags', { signal }).then((res) => res.data.tags), []);

  return (
    <section>
      <PageMeta title="Tags" description="Browse DevPress articles by technology tag." />
      <header className="page-heading">
        <div>
          <h1>Tags</h1>
          <p>Browse articles by technology. Each tag shows how many published articles use it.</p>
        </div>
      </header>

      {status === 'loading' && !tags && <LoadingSpinner label="Loading tags…" />}
      {status === 'error' && <ErrorMessage message={describeError(error).message} onRetry={reload} />}

      {tags && tags.length === 0 && <EmptyState icon="tag" title="No tags yet">Tags appear here once an article that uses them is published.</EmptyState>}

      {tags && tags.length > 0 && (
        <ul className="tag-grid" aria-label="All tags">
          {tags.map((tag) => (
            <li key={tag._id}>
              <Link to={`/tag/${tag.slug}`} className="tag-card">
                <span className="tag-card-name">
                  <span aria-hidden="true">#</span>
                  {tag.name}
                </span>
                <span className="tag-card-count">{plural(tag.postCount, 'article')}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
