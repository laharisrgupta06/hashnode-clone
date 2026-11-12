import { useState } from 'react';

// The user's picture, or their first letter if they have none (or the image fails to load).
// Decorative: whatever surrounds it must carry the user's name for screen readers.
// Give it key={user.avatarUrl} so a new URL gets a fresh "did it fail?" state.
export default function Avatar({ user }) {
  const [imageFailed, setImageFailed] = useState(false);
  const initial = [...(user.name || '?').trim()][0]?.toUpperCase() || '?';

  if (user.avatarUrl && !imageFailed) {
    return <img className="avatar" src={user.avatarUrl} alt="" onError={() => setImageFailed(true)} />;
  }
  return (
    <span className="avatar avatar-fallback" aria-hidden="true">
      {initial}
    </span>
  );
}
