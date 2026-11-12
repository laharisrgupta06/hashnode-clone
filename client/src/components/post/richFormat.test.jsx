import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import MarkdownRenderer from './MarkdownRenderer.jsx';

const html = (content) => render(<MarkdownRenderer content={content} />).container.querySelector('.markdown-body');

describe('formatting extensions render as elements', () => {
  it('underline, highlight, colour, font and size', () => {
    const body = html('A <u>under</u> <mark>hi</mark> <mark data-highlight="green">g</mark> <span data-color="rust">red</span> <span data-font="mono">m</span> <span data-size="large">L</span>');
    expect(body.querySelector('u').textContent).toBe('under');
    expect(body.querySelector('mark[data-highlight="yellow"]').textContent).toBe('hi');
    expect(body.querySelector('mark[data-highlight="green"]').textContent).toBe('g');
    expect(body.querySelector('span[data-color="rust"]').textContent).toBe('red');
    expect(body.querySelector('span[data-font="mono"]').textContent).toBe('m');
    expect(body.querySelector('span[data-size="large"]').textContent).toBe('L');
    expect(body.textContent).not.toContain('<');
  });

  it('nesting and Markdown inside formatting', () => {
    const body = html('<span data-color="ocean">**bold blue** and <u>under</u></span>');
    const span = body.querySelector('span[data-color="ocean"]');
    expect(span.querySelector('strong').textContent).toBe('bold blue');
    expect(span.querySelector('u').textContent).toBe('under');
  });

  it('alignment wraps whole blocks, Markdown inside still works', () => {
    const body = html('<div data-align="center">\n\n## Title\n\nSome *text*\n\n</div>\n\nAfter');
    const div = body.querySelector('div[data-align="center"]');
    expect(div.querySelector('h3').textContent).toBe('Title');
    expect(div.querySelector('em').textContent).toBe('text');
    expect(body.lastElementChild.textContent).toBe('After');
  });

  it('strikethrough via GFM, single tilde stays text', () => {
    const body = html('~~gone~~ and ~not~');
    expect(body.querySelector('del').textContent).toBe('gone');
    expect(body.textContent).toContain('~not~');
  });

  it('existing Markdown is unchanged: headings, lists, quotes, links, images, code', () => {
    const body = html('# H\n\n- a\n- b\n\n1. one\n\n> quote\n\n[link](https://example.com)\n\n![alt](https://example.com/i.png)\n\n```js\nconst x = 1;\n```');
    expect(body.querySelector('h2').textContent).toBe('H');
    expect(body.querySelectorAll('ul li')).toHaveLength(2);
    expect(body.querySelector('ol li').textContent).toBe('one');
    expect(body.querySelector('blockquote').textContent.trim()).toBe('quote');
    expect(body.querySelector('a[href="https://example.com"]')).toBeTruthy();
    expect(body.querySelector('img[src="https://example.com/i.png"]')).toBeTruthy();
    expect(body.querySelector('.code-block .code-block-language').textContent).toBe('js');
  });
});

describe('never renders arbitrary HTML', () => {
  const attacks = [
    '<script>alert(1)</script>',
    '<img src=x onerror="alert(1)">',
    '<span style="color:red">styled</span>',
    '<span data-color="red">not in palette</span>',
    '<span data-color="rust" onclick="alert(1)">extra attribute</span>',
    '<span data-color="rust" class="x">class</span>',
    '<div data-align="center" style="x">\n\nblock\n\n</div>',
    '<a href="javascript:alert(1)">js link</a>',
    '<iframe src="https://example.com"></iframe>',
    '<u onmouseover="x">u</u>',
    '<mark data-highlight="red">bad colour</mark>',
  ];
  for (const attack of attacks) {
    it(`shows as text: ${attack.slice(0, 40)}`, () => {
      const body = html(attack);
      expect(body.querySelector('script, iframe, img, a, [style], [onclick], [onerror], [onmouseover], [class="x"]')).toBeNull();
      expect(body.querySelector('span[data-color], mark, u, div[data-align]')).toBeNull();
      expect(body.textContent).toContain('<');
    });
  }

  it('an unclosed tag stays text and does not swallow the rest', () => {
    const body = html('<span data-color="rust">never closed and **bold**');
    expect(body.querySelector('span[data-color]')).toBeNull();
    expect(body.querySelector('strong').textContent).toBe('bold');
    expect(body.textContent).toContain('<span data-color="rust">');
  });

  it('an inline tag used as a block, or a block tag inline, stays text', () => {
    expect(html('text <div data-align="center">x</div>').querySelector('div[data-align]')).toBeNull();
  });
});
