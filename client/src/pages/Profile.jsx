import { Link, useParams } from 'react-router-dom';
import api from '../api/axios.js';
import useAuth from '../hooks/useAuth.js';
import useRequest from '../hooks/useRequest.js';
import PageMeta from '../components/common/PageMeta.jsx';
import Avatar from '../components/common/Avatar.jsx';
import PostList from '../components/post/PostList.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Icon from '../components/common/Icon.jsx';
import PublicationMark from '../components/publication/PublicationMark.jsx';
import { publicationPath } from '../utils/publication.js';
import { describeError } from '../utils/apiError.js';
import { plural } from '../utils/format.js';

// A public author profile (PRD 2.1.E): name, avatar, bio and PUBLISHED articles only.
// The server never sends the email or drafts on this route.
export default function Profile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const { status, data, error, reload } = useRequest((signal) => api.get(`/users/${encodeURIComponent(id)}`, { signal }).then((res) => res.data), [id]);

  if (status === 'loading' && !data) return <LoadingSpinner label="Loading profile…" />;
  if (status === 'error') {
    if (error.response?.status === 404) {
      return (
        <EmptyState icon="user" title="Profile not found" action={<Link to="/" className="btn btn-primary">Browse latest articles</Link>}>
          This author does not exist or the link is mistyped.
          <PageMeta title="Profile not found" />
        </EmptyState>
      );
    }
    return <ErrorMessage message={describeError(error).message} onRetry={reload} />;
  }

  const { user, posts, publications = [] } = data;
  const isMe = me && me._id === user._id;
  // On your own profile, show the freshest name/bio/avatar (e.g. right after editing Settings).
  const shown = isMe ? { ...user, name: me.name, bio: me.bio, avatarUrl: me.avatarUrl } : user;

  return (
    <section>
      <PageMeta title={shown.name} description={shown.bio || `Articles by ${shown.name} on DevPress.`} />
      <header className="profile-header">
        <div className="profile-avatar">
          <Avatar key={shown.avatarUrl} user={shown} />
        </div>
        <div className="profile-text">
          <h1>{shown.name}</h1>
          {shown.bio ? <p className="profile-bio">{shown.bio}</p> : isMe && <p className="profile-bio muted">Add a short bio in Settings so readers know who you are.</p>}
          <p className="profile-count">{plural(posts.length, 'published article')}</p>
        </div>
        {isMe && (
          <Link to="/settings" className="btn btn-secondary">
            <Icon name="settings" size={16} />
            Edit profile
          </Link>
        )}
      </header>

      {publications.length > 0 && (
        <>
          <h2 className="section-title">Publications</h2>
          <ul className="pub-strip">
            {publications.map((pub) => (
              <li key={pub._id}>
                <Link to={publicationPath(pub.slug)} className="pub-strip-item">
                  <PublicationMark publication={pub} size={36} />
                  <span>
                    <strong>{pub.name}</strong>
                    <small>{pub.tagline || `/p/${pub.slug}`}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="section-title">Articles</h2>
      {posts.length > 0 ? (
        <PostList posts={posts} showAuthor={false} label={`Articles by ${shown.name}`} />
      ) : (
        <EmptyState
          title={isMe ? 'You have not published anything yet' : 'No published articles yet'}
          action={
            isMe && (
              <Link to="/publications" className="btn btn-primary">
                Go to my publications
              </Link>
            )
          }
        >
          {isMe ? 'Drafts stay private. Publish one to show it here.' : `${shown.name} has not published any articles yet.`}
        </EmptyState>
      )}
    </section>
  );
}
