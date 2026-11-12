// Rules shared by the publication and domain controllers. The client mirrors the limits.

export const NAME_MAX = 60;
export const TAGLINE_MAX = 80;
export const DESCRIPTION_MAX = 300;
export const SLUG_MIN = 3;
export const SLUG_MAX = 40;

// A publication slug becomes part of its address (/p/<slug>, and later <slug>.<platform domain>),
// so it must be lowercase letters, digits and single hyphens, not starting or ending with a hyphen.
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9]))*$/;

// Words that would clash with routes or look official as a subdomain.
export const RESERVED_SLUGS = new Set([
  'new', 'mine', 'check-slug', 'resolve-host', 'manage', 'api', 'www', 'app', 'admin', 'administrator',
  'dashboard', 'settings', 'login', 'logout', 'register', 'signup', 'explore', 'discover', 'about',
  'help', 'support', 'mail', 'email', 'blog', 'static', 'assets', 'cdn', 'status', 'docs', 'p',
  'publications', 'devpress', 'root', 'system', 'security',
]);

// Curated appearance choices for publication websites (direction A). Every accent is dark enough for
// white button text and for links on a white page (contrast at least 4.5:1, checked in the client tests).
export const ACCENT_COLORS = ['#1f5e4b', '#1d4e89', '#8a2f2f', '#6b4a1f', '#33404d'];
export const FONT_PRESETS = ['editorial', 'sans'];
export const LAYOUTS = ['list', 'grid'];
export const DEFAULT_APPEARANCE = { accentColor: ACCENT_COLORS[0], fontPreset: 'editorial', layout: 'list' };

export function checkSlug(slug) {
  if (typeof slug !== 'string' || !slug) return 'Choose an address for your publication';
  if (slug.length < SLUG_MIN) return `The address needs at least ${SLUG_MIN} characters`;
  if (slug.length > SLUG_MAX) return `The address can have at most ${SLUG_MAX} characters`;
  if (!SLUG_PATTERN.test(slug)) return 'Use lowercase letters, numbers and single hyphens only, not starting or ending with a hyphen';
  if (RESERVED_SLUGS.has(slug)) return 'That address is reserved';
  return null;
}

// A custom domain: a full host name such as blog.example.com (no scheme, no path, no port).
const HOST_PATTERN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
export function checkHostname(hostname) {
  if (typeof hostname !== 'string' || !hostname) return 'Enter a domain such as blog.example.com';
  if (!HOST_PATTERN.test(hostname)) return 'Enter a domain name only, such as blog.example.com (no https:// and no path)';
  return null;
}
