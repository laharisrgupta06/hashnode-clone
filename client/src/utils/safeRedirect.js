// After login the user goes back to the page they originally asked for.
// That destination must never be able to send them to ANOTHER website (an "open redirect"),
// so every destination goes through this function. Anything suspicious gives the fallback.
//
// Accepts a string ("/post/abc?x=1") or a router location ({ pathname, search, hash }).
export function safeRedirect(from, fallback = '/dashboard') {
  let target = '';
  if (typeof from === 'string') {
    target = from;
  } else if (from && typeof from === 'object' && typeof from.pathname === 'string') {
    target = `${from.pathname}${typeof from.search === 'string' ? from.search : ''}${typeof from.hash === 'string' ? from.hash : ''}`;
  }

  // Must be a path on THIS site: starts with exactly one "/".
  if (!target.startsWith('/')) return fallback;
  if (target.startsWith('//') || target.startsWith('/\\')) return fallback; // "//evil.com" means "another site"

  // No backslashes (some browsers treat "\" like "/") and no control characters
  // (browsers silently delete tabs/newlines, so "/<tab>/evil.com" would turn into "//evil.com").
  if (/[\\\u0000-\u001f\u007f]/.test(target)) return fallback;

  // Last line of defence: let the browser's own URL parser resolve it and check it stayed on this site.
  try {
    if (new URL(target, window.location.origin).origin !== window.location.origin) return fallback;
  } catch {
    return fallback;
  }

  // Never "return" to the login or register page: that would loop.
  const path = target.split(/[?#]/)[0].replace(/\/+$/, '').toLowerCase();
  if (path === '/login' || path === '/register') return fallback;

  return target;
}
