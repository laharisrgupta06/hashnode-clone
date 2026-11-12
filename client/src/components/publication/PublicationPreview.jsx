import { useState } from 'react';
import PublicationMark from './PublicationMark.jsx';
import { isSafeImage } from './previewUtils.js';
import { appearanceStyle } from '../../utils/publication.js';

// Keyed by its URL (see below), so a corrected address gets a fresh attempt.
function PreviewCover({ src }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return <img className="pub-preview-cover" src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

// A small live preview of a publication's website header, in its own editorial style (direction A).
// Shows only what the owner has entered; the article rows are clearly labelled placeholders.
export default function PublicationPreview({ publication }) {
  const { appearance } = publication;
  const cover = isSafeImage(publication.coverImage) ? publication.coverImage : '';
  const logo = isSafeImage(publication.logoUrl) ? publication.logoUrl : '';

  return (
    <div className={`pub-site pub-preview font-${appearance.fontPreset}`} style={appearanceStyle(appearance)} aria-label="Preview of your publication website">
      <div className="pub-preview-bar">
        <span />
        <span />
        <span />
        <code>/p/{publication.slug || 'your-address'}</code>
      </div>
      <PreviewCover key={cover} src={cover} />
      <div className="pub-preview-body">
        <div className="pub-preview-head">
          <PublicationMark key={logo} publication={{ name: publication.name || 'Your publication', logoUrl: logo }} size={44} />
          <div>
            <p className="pub-preview-name">{publication.name || 'Your publication'}</p>
            {publication.tagline && <p className="pub-preview-tagline">{publication.tagline}</p>}
          </div>
        </div>
        {publication.description && <p className="pub-preview-description">{publication.description}</p>}
        <div className={`pub-preview-articles layout-${appearance.layout}`}>
          {[1, 2].map((n) => (
            <div key={n} className="pub-preview-article">
              <span className="pub-preview-line wide" />
              <span className="pub-preview-line" />
            </div>
          ))}
        </div>
        <p className="pub-preview-note">Placeholder rows: your published articles appear here.</p>
      </div>
    </div>
  );
}
