import { useState } from 'react';

// An article cover image that disappears cleanly if the URL is broken, instead of showing the
// browser's broken-image icon. Decorative (alt="") because the title next to it says the same thing.
// Give it key={src} so a new URL gets a fresh "did it fail?" state.
export default function CoverImage({ src, className = '', eager = false }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <img
      className={`cover-image ${className}`}
      src={src}
      alt=""
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
