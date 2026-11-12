import { describe, it, expect } from 'vitest';
import { suggestSlug, checkSlugFormat, hostMode, ACCENTS, articlePath, publicationPath } from './publication.js';

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('publication slugs', () => {
  it('suggests a URL-safe address from a name', () => {
    expect(suggestSlug("Lahari's Tech Journal")).toBe('laharis-tech-journal');
    expect(suggestSlug('  Café & Code!! ')).toBe('cafe-code');
    expect(suggestSlug('x'.repeat(50))).toHaveLength(40);
    expect(suggestSlug('!!!')).toBe('');
  });

  it('checks the format like the server does', () => {
    expect(checkSlugFormat('lahari-tech')).toBeNull();
    for (const bad of ['', 'ab', 'Has-Caps', 'has space', '-lead', 'trail-', 'dou--ble', 'under_score', 'x'.repeat(41)]) {
      expect(checkSlugFormat(bad)).not.toBeNull();
    }
  });

  it('builds website paths', () => {
    expect(publicationPath('lahari-tech')).toBe('/p/lahari-tech');
    expect(articlePath('lahari-tech', 'hello-world')).toBe('/p/lahari-tech/hello-world');
  });
});

describe('host routing decisions', () => {
  it('without a configured platform domain, everything is the platform (path-based sites only)', () => {
    expect(hostMode('localhost', '')).toEqual({ mode: 'platform' });
    expect(hostMode('anything.example.com', '')).toEqual({ mode: 'platform' });
  });
  it('with a platform domain: root and www are the platform, one-level subdomains are publications', () => {
    expect(hostMode('devpress.dev', 'devpress.dev')).toEqual({ mode: 'platform' });
    expect(hostMode('www.devpress.dev', 'devpress.dev')).toEqual({ mode: 'platform' });
    expect(hostMode('lahari-tech.devpress.dev', 'devpress.dev')).toEqual({ mode: 'subdomain', slug: 'lahari-tech' });
    expect(hostMode('a.b.devpress.dev', 'devpress.dev')).toEqual({ mode: 'platform' });
  });
  it('any other host is treated as a possible custom domain; localhost always stays the platform', () => {
    expect(hostMode('blog.example.com', 'devpress.dev')).toEqual({ mode: 'custom', host: 'blog.example.com' });
    expect(hostMode('localhost', 'devpress.dev')).toEqual({ mode: 'platform' });
  });
});

describe('publication accent colours', () => {
  // Publication pages use ivory paper (#fcfaf7) and a beige surface (#f4f0ea): see styles/publication.css.
  it.each(ACCENTS.map((a) => [a.label, a.value]))('%s works as a button with white text and as link text on the page and surface', (_label, value) => {
    expect(contrast('#ffffff', value)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(value, '#fcfaf7')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(value, '#f4f0ea')).toBeGreaterThanOrEqual(4.5);
  });
});
