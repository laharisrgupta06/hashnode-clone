// Publication helpers shared by the workspace, the creation form and the publication websites.
// The limits mirror server/utils/publicationRules.js; the server stays the authority.

export const NAME_MAX = 60;
export const TAGLINE_MAX = 80;
export const DESCRIPTION_MAX = 300;
export const SLUG_MIN = 3;
export const SLUG_MAX = 40;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9]))*$/;

// Curated appearance options for publication websites (direction A). Every accent passes 4.5:1
// with white text and as text on white (see publication.test.js).
export const ACCENTS = [
  { value: '#1f5e4b', label: 'Bottle green' },
  { value: '#1d4e89', label: 'Ink blue' },
  { value: '#8a2f2f', label: 'Oxblood' },
  { value: '#6b4a1f', label: 'Umber' },
  { value: '#33404d', label: 'Slate' },
];
export const FONT_PRESETS = [
  { value: 'editorial', label: 'Editorial', hint: 'Serif headlines and article text (Newsreader), sans-serif interface' },
  { value: 'sans', label: 'Clean sans', hint: 'Sans-serif throughout (Public Sans)' },
];
export const LAYOUTS = [
  { value: 'list', label: 'List', hint: 'One article per row, text first' },
  { value: 'grid', label: 'Grid', hint: 'Two columns of cards with cover images' },
];
export const DEFAULT_APPEARANCE = { accentColor: ACCENTS[0].value, fontPreset: 'editorial', layout: 'list' };

// "Lahari's Tech Journal" -> "laharis-tech-journal" (a suggestion; the user can change it).
export function suggestSlug(name) {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '');
}

// Format check only (availability needs the server). Returns a message or null.
export function checkSlugFormat(slug) {
  if (!slug) return 'Choose an address for your publication';
  if (slug.length < SLUG_MIN) return `The address needs at least ${SLUG_MIN} characters`;
  if (slug.length > SLUG_MAX) return `The address can have at most ${SLUG_MAX} characters`;
  if (!SLUG_PATTERN.test(slug)) return 'Use lowercase letters, numbers and single hyphens only, not starting or ending with a hyphen';
  return null;
}

// Where a publication's website lives inside this app (works on every host today).
export const publicationPath = (slug) => `/p/${slug}`;
export const articlePath = (publicationSlug, postSlug) => `/p/${publicationSlug}/${postSlug}`;
export const workspacePath = (slug, section = 'dashboard') => `/publications/${slug}/${section}`;

// The platform domain publications will get subdomains under. Not assumed: it must be configured.
export const PLATFORM_DOMAIN = (import.meta.env.VITE_PLATFORM_DOMAIN || '').trim().toLowerCase();

// The address readers can use today, and the subdomain address once the platform domain is live.
export function publicationAddresses(slug, origin = window.location.origin) {
  return {
    current: `${origin}${publicationPath(slug)}`,
    subdomain: PLATFORM_DOMAIN ? `${slug}.${PLATFORM_DOMAIN}` : null,
  };
}

// Decides how this browser host should be served (see App.jsx):
//   { mode: 'platform' }                 the DevPress app itself
//   { mode: 'subdomain', slug }          <slug>.<platform domain>
//   { mode: 'custom', host }             any other host: a custom domain, resolved by the API
export function hostMode(hostname, platformDomain = PLATFORM_DOMAIN) {
  const host = hostname.toLowerCase();
  const local = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.localhost');
  if (!platformDomain || local) return { mode: 'platform' };
  if (host === platformDomain || host === `www.${platformDomain}`) return { mode: 'platform' };
  if (host.endsWith(`.${platformDomain}`)) {
    const slug = host.slice(0, -platformDomain.length - 1);
    return slug.includes('.') ? { mode: 'platform' } : { mode: 'subdomain', slug };
  }
  return { mode: 'custom', host };
}

// Inline CSS custom properties for a publication's chosen appearance (used by its website and previews).
export function appearanceStyle(appearance = DEFAULT_APPEARANCE) {
  const accent = ACCENTS.some((a) => a.value === appearance.accentColor) ? appearance.accentColor : DEFAULT_APPEARANCE.accentColor;
  return { '--pub-accent': accent };
}
