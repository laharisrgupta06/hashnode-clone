import { Link } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta.jsx';
import Avatar from '../../components/common/Avatar.jsx';
import { useSite } from '../../components/publication/siteContext.js';
import { formatDate, plural } from '../../utils/format.js';

// About this publication: description, who runs it, real counts.
export default function PubAbout() {
  const { base, publication, tags } = useSite();
  return (
    <div className="pub-container pub-about">
      <PageMeta title={`About ${publication.name}`} description={publication.description || undefined} />
      <p className="pub-article-kicker">About</p>
      <h1>{publication.name}</h1>
      {publication.tagline && <p className="pub-tagline">{publication.tagline}</p>}
      {publication.description ? <p className="pub-description">{publication.description}</p> : <p className="pub-description">This publication has not added a description yet.</p>}

      <dl className="pub-facts">
        <div>
          <dt>Published articles</dt>
          <dd>{publication.publishedCount}</dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd>{formatDate(publication.createdAt)}</dd>
        </div>
        <div>
          <dt>Topics</dt>
          <dd>{tags.length > 0 ? tags.map((t) => `#${t.name}`).join(', ') : 'None yet'}</dd>
        </div>
      </dl>

      {publication.owner && (
        <section className="pub-author-card" aria-label="Run by">
          <Avatar key={publication.owner.avatarUrl} user={publication.owner} />
          <div>
            <p className="pub-author-label">Run by</p>
            <p className="pub-author-name">
              <Link to={`/profile/${publication.owner._id}`}>{publication.owner.name}</Link>
            </p>
            {publication.owner.bio && <p className="pub-author-bio">{publication.owner.bio}</p>}
          </div>
        </section>
      )}

      <p>
        <Link to={base || '/'}>Read {plural(publication.publishedCount, 'article')} in {publication.name}</Link>
      </p>
    </div>
  );
}
