import { Link } from 'react-router-dom';
import Avatar from '../common/Avatar.jsx';
import CoverImage from '../common/CoverImage.jsx';
import { TagList } from './TagPill.jsx';
import { formatDate } from '../../utils/format.js';
import { articlePath, publicationPath } from '../../utils/publication.js';

// One article in a platform list (Explore, topics, author profiles). It links to the article
// inside its publication's website, and names the publication it belongs to.
export default function PostCard({ post, showAuthor = true }) {
  const author = post.author;
  const pub = post.publication && typeof post.publication === 'object' ? post.publication : null;
  const href = pub ? articlePath(pub.slug, post.slug) : `/post/${post.slug}`;
  return (
    <article className="post-card">
      <div className="post-card-body">
        <p className="post-card-meta">
          {showAuthor && author && (
            <Link to={`/profile/${author._id}`} className="post-card-author">
              <Avatar key={author.avatarUrl} user={author} />
              <span>{author.name}</span>
            </Link>
          )}
          {pub && (
            <>
              {showAuthor && author && <span aria-hidden="true">in</span>}
              <Link to={publicationPath(pub.slug)} className="post-card-pub">
                {pub.name}
              </Link>
            </>
          )}
          <span aria-hidden="true">·</span>
          <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
        </p>
        <h2 className="post-card-title">
          <Link to={href} className="stretched-link">
            {post.title}
          </Link>
        </h2>
        {post.excerpt && <p className="post-card-excerpt">{post.excerpt}</p>}
        <TagList tags={post.tags} label={`Tags for ${post.title}`} />
      </div>
      {post.coverImage && (
        <div className="post-card-cover">
          <CoverImage key={post.coverImage} src={post.coverImage} />
        </div>
      )}
    </article>
  );
}
