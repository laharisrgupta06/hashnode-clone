import { describe, it, expect } from 'vitest';
import { safeRedirect } from './safeRedirect.js';

// jsdom runs the tests on http://localhost:3000, so that is "this site" here.
const FALLBACK = '/publications';

describe('safeRedirect: destinations on this site are kept', () => {
  const allowed = [
    '/',
    '/dashboard',
    '/settings',
    '/editor/new',
    '/editor/6af48e842a5084ca2eeb6471',
    '/post/my-first-post',
    '/post/my-first-post?ref=feed',
    '/post/my-first-post#comments',
    '/tag/javascript?search=react#top',
    '/profile/6af48e842a5084ca2eeb6471',
    '/logins', // only exactly /login and /register are excluded
  ];
  it.each(allowed)('keeps %s', (target) => {
    expect(safeRedirect(target)).toBe(target);
  });

  it('accepts a router location object and rebuilds pathname + search + hash', () => {
    expect(safeRedirect({ pathname: '/post/abc', search: '?x=1', hash: '#h' })).toBe('/post/abc?x=1#h');
  });
});

describe('safeRedirect: anything that could leave the site or loop falls back', () => {
  const hostile = [
    'https://evil.com',
    'http://evil.com/dashboard',
    'HTTPS://EVIL.COM',
    '//evil.com',
    '//evil.com/dashboard',
    '///evil.com',
    '/\\evil.com',
    '\\\\evil.com',
    '/\\/evil.com',
    '\\/evil.com',
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'mailto:someone@example.com',
    'evil.com',
    'dashboard',
    './dashboard',
    '../dashboard',
    '',
    ' /dashboard',
    '/\tevil.com',
    '/\t/evil.com',
    '/\n/evil.com',
    '/\r/evil.com',
    '/\u0000/evil.com',
    '/\u007f',
    '/post/x\\y',
    '/login',
    '/login/',
    '/LOGIN',
    '/login?next=/dashboard',
    '/login#x',
    '/register',
    '/register/',
    '/Register?x=1',
    '//login',
  ];
  it.each(hostile)('rejects %j', (target) => {
    expect(safeRedirect(target)).toBe(FALLBACK);
  });

  it.each([undefined, null, 42, true, {}, [], { pathname: 42 }, { pathname: '//evil.com' }])('rejects non-string input %j', (value) => {
    expect(safeRedirect(value)).toBe(FALLBACK);
  });

  it('uses a custom fallback when given one', () => {
    expect(safeRedirect('//evil.com', '/')).toBe('/');
  });
});
