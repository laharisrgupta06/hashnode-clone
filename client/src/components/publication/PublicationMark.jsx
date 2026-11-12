import { useState } from 'react';
import { ACCENTS } from '../../utils/publication.js';

// A publication's logo, or its first letter when there is no logo (or it fails to load).
// Decorative: the publication name always appears next to it.
export default function PublicationMark({ publication, size = 40, className = '' }) {
  const [failed, setFailed] = useState(false);
  const initial = [...(publication?.name || '?').trim()][0]?.toUpperCase() || '?';
  // The letter mark is underlined in the publication's own accent (only a curated accent is used).
  const accent = publication?.appearance?.accentColor;
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  if (ACCENTS.some((a) => a.value === accent)) style['--pub-mark-accent'] = accent;
  if (publication?.logoUrl && !failed) {
    return <img className={`pub-mark ${className}`} style={style} src={publication.logoUrl} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
  }
  return (
    <span className={`pub-mark pub-mark-fallback ${className}`} style={style} aria-hidden="true">
      {initial}
    </span>
  );
}
