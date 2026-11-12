import { useEffect } from 'react';
import { SITE } from '../../config/site.js';

// Sets the browser-tab title and the meta description for the current page:
//   <PageMeta title="Log in" description="Log in to write and manage your articles." />
// gives the tab "Log in | DevPress". Without a title the tab shows just the site name.
// It updates the ONE description tag that index.html already has, so there are never duplicates.
export function formatTitle(title) {
  return title ? `${title} | ${SITE.name}` : SITE.name;
}

export default function PageMeta({ title, description }) {
  useEffect(() => {
    document.title = formatTitle(title);

    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', 'description');
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', description || SITE.description);
  }, [title, description]);

  return null;
}
