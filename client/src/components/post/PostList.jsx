import PostCard from './PostCard.jsx';

// Renders a list of PostCards (PRD 6.2), used on the feed, tag pages and profiles.
export default function PostList({ posts, showAuthor = true, label = 'Articles' }) {
  return (
    <ul className="post-list" aria-label={label}>
      {posts.map((post) => (
        <li key={post._id}>
          <PostCard post={post} showAuthor={showAuthor} />
        </li>
      ))}
    </ul>
  );
}
