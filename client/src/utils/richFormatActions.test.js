import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { createElement } from 'react';
import { FORMATS, fenceAt, formatState, linkAt } from './markdownFormat.js';
import { joinPages, paginate } from './typewriterPages.js';
import MarkdownRenderer from '../components/post/MarkdownRenderer.jsx';

// Applies a toolbar action like the editor does; returns the new text and selection.
function run(id, text, start, end = start, value) {
  const edit = FORMATS[id](text, start, end, value);
  if (!edit) return null;
  const next = text.slice(0, edit.from) + edit.insert + text.slice(edit.to);
  return { text: next, start: edit.selectStart, end: edit.selectEnd, selected: next.slice(edit.selectStart, edit.selectEnd) };
}
const renderBody = (md) => render(createElement(MarkdownRenderer, { content: md })).container.querySelector('.markdown-body');

describe('inline formats apply and remove cleanly', () => {
  const cases = [
    ['underline', undefined, '<u>word</u>', 'u'],
    ['strikethrough', undefined, '~~word~~', 'del'],
    ['bold', undefined, '**word**', 'strong'],
    ['italic', undefined, '_word_', 'em'],
    ['color', 'ocean', '<span data-color="ocean">word</span>', 'span[data-color="ocean"]'],
    ['font', 'serif', '<span data-font="serif">word</span>', 'span[data-font="serif"]'],
    ['size', 'xlarge', '<span data-size="xlarge">word</span>', 'span[data-size="xlarge"]'],
    ['highlight', 'pink', '<mark data-highlight="pink">word</mark>', 'mark[data-highlight="pink"]'],
    ['highlight', 'yellow', '<mark>word</mark>', 'mark[data-highlight="yellow"]'],
  ];
  for (const [id, value, expected, selector] of cases) {
    it(`${id}${value ? `=${value}` : ''}: apply, render, survive pages, remove`, () => {
      const applied = run(id, 'one word here', 4, 8, value);
      expect(applied.text).toBe(`one ${expected} here`);
      expect(applied.selected).toBe('word');
      // renders as the element
      expect(renderBody(applied.text).querySelector(selector).textContent).toBe('word');
      // the typewriter's pages never change the Markdown
      expect(joinPages(paginate(applied.text))).toBe(applied.text);
      // removing gives back the original text (toggle, or value '' for the dropdowns)
      const removed = run(id, applied.text, applied.start, applied.end, value ? '' : undefined);
      expect(removed.text).toBe('one word here');
    });
  }

  it('changing a colour replaces the tag instead of nesting', () => {
    const applied = run('color', 'a b c', 2, 3, 'rust');
    const changed = run('color', applied.text, applied.start, applied.end, 'forest');
    expect(changed.text).toBe('a <span data-color="forest">b</span> c');
  });

  it('formats stack: colour inside highlight inside underline', () => {
    let r = run('underline', 'x key y', 2, 5);
    r = run('highlight', r.text, r.start, r.end, 'green');
    r = run('color', r.text, r.start, r.end, 'plum');
    expect(r.text).toBe('x <u><mark data-highlight="green"><span data-color="plum">key</span></mark></u> y');
    const body = renderBody(r.text);
    expect(body.querySelector('u mark[data-highlight="green"] span[data-color="plum"]').textContent).toBe('key');
  });

  it('clear formatting removes every inline format around and inside the selection', () => {
    const md = 'x <u><mark data-highlight="green"><span data-color="plum">**key**</span></mark></u> y';
    const inner = md.indexOf('**key**');
    const cleared = run('clear', md, inner, inner + '**key**'.length);
    expect(cleared.text).toBe('x key y');
  });

  it('removing a value that is not applied changes nothing', () => {
    expect(run('color', 'plain', 0, 5, '')).toBeNull();
  });
});

describe('block formats', () => {
  it('paragraph and headings 1 to 3 replace each other', () => {
    expect(run('heading1', 'Title', 0).text).toBe('# Title');
    expect(run('heading3', '# Title', 0).text).toBe('### Title');
    expect(run('paragraph', '### Title', 0).text).toBe('Title');
  });

  it('separator goes on its own line', () => {
    expect(run('separator', 'above\nbelow', 2).text).toBe('above\n\n---\n\nbelow');
    expect(renderBody(run('separator', 'above\nbelow', 2).text).querySelector('hr')).toBeTruthy();
  });

  it('indent and outdent nest list items (only list items)', () => {
    const indented = run('indent', '- a\n- b', 4);
    expect(indented.text).toBe('- a\n    - b');
    expect(renderBody(indented.text).querySelector('ul li ul li').textContent).toBe('b');
    expect(run('outdent', indented.text, 9).text).toBe('- a\n- b');
    expect(run('indent', 'plain paragraph', 0)).toBeNull();
  });

  it('alignment wraps the lines in an alignment block, can change and be removed', () => {
    const centred = run('align', 'before\n\nmiddle\n\nafter', 9, 9, 'center');
    expect(centred.text).toBe('before\n\n<div data-align="center">\n\nmiddle\n\n</div>\n\nafter');
    expect(renderBody(centred.text).querySelector('div[data-align="center"]').textContent.trim()).toBe('middle');
    const right = run('align', centred.text, centred.start, centred.end, 'right');
    expect(right.text).toContain('<div data-align="right">');
    expect(run('align', right.text, right.start, right.end, '').text).toBe('before\n\nmiddle\n\nafter');
  });
});

describe('links, code and images', () => {
  it('edit selects the address of the link under the cursor; remove keeps the text', () => {
    const md = 'see [docs](https://a.example) now';
    expect(linkAt(md, 6)).toMatchObject({ label: 'docs', url: 'https://a.example' });
    expect(run('editLink', md, 6).selected).toBe('https://a.example');
    expect(run('removeLink', md, 6).text).toBe('see docs now');
    expect(run('removeLink', 'no link', 2)).toBeNull();
  });

  it('code block with a language; inside a block, choosing a language changes it', () => {
    const inserted = run('codeBlock', 'x = 1', 0, 5, 'python');
    expect(inserted.text).toBe('```python\nx = 1\n```');
    expect(fenceAt(inserted.text, 11)).toMatchObject({ lang: 'python' });
    expect(run('codeBlock', inserted.text, 11, 11, 'rust').text).toBe('```rust\nx = 1\n```');
  });

  it('image by URL becomes its own paragraph and renders', () => {
    const r = run('image', 'text', 4, 4, { url: 'https://example.com/a.png', alt: 'Diagram' });
    expect(r.text).toBe('text\n\n![Diagram](https://example.com/a.png)');
    expect(renderBody(r.text).querySelector('img[alt="Diagram"]').getAttribute('src')).toBe('https://example.com/a.png');
  });
});

describe('active state for the toolbar', () => {
  it('reports headings, lists, inline formats and open formatting tags', () => {
    const md = '## Title\n\nA <span data-color="rust"><mark data-highlight="blue">hot</mark> word</span> and **bold**\n\n- item';
    expect(formatState(md, 3, 3).block).toBe('heading2');
    const hot = md.indexOf('hot') + 1;
    expect(formatState(md, hot, hot)).toMatchObject({ block: 'paragraph', color: 'rust', highlight: 'blue' });
    const word = md.indexOf('word') + 1;
    expect(formatState(md, word, word)).toMatchObject({ color: 'rust', highlight: '' });
    const b = md.indexOf('bold');
    expect(formatState(md, b, b + 4).bold).toBe(true);
    expect(formatState(md, md.length - 1, md.length - 1).bulletList).toBe(true);
  });

  it('reports alignment and the code language', () => {
    const md = '<div data-align="right">\n\nx\n\n</div>\n\n```go\nfmt.Println()\n```';
    expect(formatState(md, md.indexOf('x'), md.indexOf('x')).align).toBe('right');
    const inCode = md.indexOf('fmt');
    expect(formatState(md, inCode, inCode).codeLanguage).toBe('go');
  });
});

describe('one article with everything survives every representation', () => {
  const article = [
    '# Title',
    '',
    '<div data-align="center">',
    '',
    '<span data-font="serif"><span data-size="xlarge">A centred serif line</span></span>',
    '',
    '</div>',
    '',
    'Text with <u>underline</u>, ~~strike~~, <mark>highlight</mark> and <span data-color="forest">green</span>.',
    '',
    '- a list',
    '    - nested',
    '',
    '> a quote',
    '',
    '---',
    '',
    '```python',
    'def f():',
    '\treturn 1  # tab kept',
    '```',
    '',
    '![alt](https://example.com/i.png) and [a link](https://example.com)',
  ].join('\n');

  it('the typewriter pages give back the exact Markdown', () => {
    expect(joinPages(paginate(article))).toBe(article);
  });

  it('the rendered article has every format', () => {
    const body = renderBody(article);
    expect(body.querySelector('div[data-align="center"] span[data-font="serif"] span[data-size="xlarge"]').textContent).toBe('A centred serif line');
    expect(body.querySelector('u').textContent).toBe('underline');
    expect(body.querySelector('del').textContent).toBe('strike');
    expect(body.querySelector('mark').textContent).toBe('highlight');
    expect(body.querySelector('span[data-color="forest"]').textContent).toBe('green');
    expect(body.querySelector('ul ul li').textContent).toBe('nested');
    expect(body.querySelector('blockquote')).toBeTruthy();
    expect(body.querySelector('hr')).toBeTruthy();
    expect(body.querySelector('.code-block-language').textContent).toBe('python');
    expect(body.querySelector('pre').textContent).toContain('\treturn 1');
    expect(body.querySelector('img')).toBeTruthy();
    expect(body.querySelector('a[href="https://example.com"]')).toBeTruthy();
    expect(body.textContent).not.toMatch(/<\/?(u|mark|span|div)/);
  });

  it('JSON save and reload (what the API stores) keeps it byte for byte', () => {
    expect(JSON.parse(JSON.stringify({ content: article })).content).toBe(article);
  });
});
