import { describe, it, expect, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import MarkdownRenderer, { resolveLanguage } from './MarkdownRenderer.jsx';

const renderMd = (content) => render(<MarkdownRenderer content={content} />).container;

afterEach(() => {
  delete window.__pwned;
});

describe('MarkdownRenderer: features (PRD 2.1.B)', () => {
  it('renders headings one level below the page title, emphasis, lists, quotes, rules and inline code', () => {
    const el = renderMd('# Big\n\n## Section\n\n**bold** _it_ `code`\n\n- a\n- b\n\n1. one\n\n> quote\n\n---');
    expect(el.querySelector('h1')).toBeNull(); // the article title is the only h1
    expect(el.querySelector('h2').textContent).toBe('Big');
    expect(el.querySelector('h3').textContent).toBe('Section');
    expect(el.querySelector('strong').textContent).toBe('bold');
    expect(el.querySelector('em').textContent).toBe('it');
    expect(el.querySelector('p code').textContent).toBe('code');
    expect(el.querySelectorAll('ul li')).toHaveLength(2);
    expect(el.querySelectorAll('ol li')).toHaveLength(1);
    expect(el.querySelector('blockquote').textContent.trim()).toBe('quote');
    expect(el.querySelector('hr')).toBeTruthy();
  });

  it('highlights fenced code in a known language and labels the block', () => {
    const el = renderMd('```js\nconst a = 1;\n```');
    expect(el.querySelector('.code-block-language').textContent).toBe('js');
    expect(el.querySelectorAll('.code-block .token').length).toBeGreaterThan(0);
    expect(el.querySelector('.code-block pre').textContent).toBe('const a = 1;');
  });

  it('shows an unknown language as plain, unhighlighted code', () => {
    const el = renderMd('```brainfuck\n+++\n```');
    expect(el.querySelectorAll('.token')).toHaveLength(0);
    expect(el.querySelector('.code-block pre code').textContent).toBe('+++');
  });

  it('resolves common language aliases', () => {
    expect(resolveLanguage('language-js')).toBe('javascript');
    expect(resolveLanguage('language-ts')).toBe('typescript');
    expect(resolveLanguage('language-html')).toBe('markup');
    expect(resolveLanguage('language-sh')).toBe('bash');
    expect(resolveLanguage('language-nope')).toBeNull();
    expect(resolveLanguage('')).toBeNull();
  });
});

describe('MarkdownRenderer: security (content is rendered safely)', () => {
  it.each([
    ['a script tag', '<script>window.__pwned = 1</script>'],
    ['an onerror handler', '<img src="x" onerror="window.__pwned = 1">'],
    ['an iframe', '<iframe src="https://example.com"></iframe>'],
    ['a raw anchor with javascript:', '<a href="javascript:window.__pwned=1">x</a>'],
    ['an svg with onload', '<svg onload="window.__pwned=1"></svg>'],
  ])('never turns raw HTML into elements (%s): it stays inert, escaped text', (_label, input) => {
    const el = renderMd(`text\n\n${input}\n\nmore`);
    expect(el.querySelector('script, iframe, svg, img, a')).toBeNull();
    const handlers = [...el.querySelectorAll('*')].flatMap((node) => [...node.attributes].map((a) => a.name)).filter((name) => name.startsWith('on'));
    expect(handlers).toEqual([]);
    expect(window.__pwned).toBeUndefined();
  });

  it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'vbscript:msgbox(1)', 'data:text/html,<script>alert(1)</script>'])(
    'renders a [link](%s) as plain text with no href',
    (url) => {
      const el = renderMd(`[click me](${url})`);
      expect(el.querySelector('a')).toBeNull();
      expect(el.textContent).toContain('click me');
    }
  );

  it('drops images with unsafe sources', () => {
    expect(renderMd('![x](javascript:alert(1))').querySelector('img')).toBeNull();
  });

  it('opens external links in a new tab without giving that page access to this one', () => {
    const link = renderMd('[MDN](https://developer.mozilla.org/)').querySelector('a');
    expect(link.getAttribute('href')).toBe('https://developer.mozilla.org/');
    expect(link.target).toBe('_blank');
    expect(link.rel.split(' ')).toEqual(expect.arrayContaining(['noopener', 'noreferrer', 'nofollow', 'ugc']));
  });

  it('lazy-loads safe images and does not leak the page address to the image host', () => {
    const img = renderMd('![diagram](https://example.com/a.png)').querySelector('img');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(img.alt).toBe('diagram');
  });
});
