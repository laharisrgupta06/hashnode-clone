import { Link } from 'react-router-dom';

// A small tag badge linking to that tag's page (PRD 6.2). Tag names are stored lowercase.
export default function TagPill({ tag }) {
  return (
    <Link to={`/tag/${tag.slug}`} className="tag-pill">
      <span aria-hidden="true">#</span>
      {tag.name}
    </Link>
  );
}

export function TagList({ tags, label = 'Tags' }) {
  if (!tags?.length) return null;
  return (
    <ul className="tag-list" aria-label={label}>
      {tags.map((tag) => (
        <li key={tag._id ?? tag.slug}>
          <TagPill tag={tag} />
        </li>
      ))}
    </ul>
  );
}
