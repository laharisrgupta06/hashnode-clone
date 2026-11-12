import { describe, expect, it } from 'vitest';
import { CAPACITY, ROW_STYLE, caretOffset, joinPages, paginate } from './typewriterPages.js';

const lorem = (n) => Array.from({ length: n }, (_, i) => `Sentence ${i + 1} explains one more step of the build in plain words.`).join(' ');
const heightOf = (page) => page.rows.reduce((s, r) => s + ROW_STYLE[r.kind].height, 0);

describe('paginate: the Markdown is never changed', () => {
  const samples = {
    empty: '',
    oneLine: 'Hello',
    trailingNewline: 'Hello\n',
    mixed: `# Title\n\nSome **bold** and *italic* text with a [link](https://example.com).\n\n- one\n- two\n  - nested item that is long enough to wrap across more than a single row on the page\n\n1. first\n2. second\n\n> A quote\n\n\`\`\`js\nconst a = 1;\n\tif (a) {\n\t\treturn a; // tabs kept\n\t}\n\`\`\`\n\n${lorem(30)}`,
    longWord: 'x'.repeat(400),
    unclosedFence: '```python\nprint("never closed")\nx = 1',
  };
  for (const [name, content] of Object.entries(samples)) {
    it(`rebuilds exactly: ${name}`, () => {
      expect(joinPages(paginate(content))).toBe(content);
    });
  }

  it('accepts 500 lines of pasted code at once, in order, without loss', () => {
    const code = Array.from({ length: 500 }, (_, i) => `    const value${i} = compute(${i}, "${'z'.repeat(i % 70)}");`).join('\n');
    const content = `## Big paste\n\n\`\`\`ts\n${code}\n\`\`\`\n`;
    const pages = paginate(content);
    expect(joinPages(pages)).toBe(content);
    expect(pages.length).toBeGreaterThan(10);
  });
});

describe('paginate: page layout', () => {
  it('always returns at least one page', () => {
    expect(paginate('')).toEqual([{ rows: [], used: 0 }]);
  });

  it('never overfills a page', () => {
    const pages = paginate(`${lorem(200)}\n\n${'line\n'.repeat(300)}`);
    for (const page of pages) {
      expect(heightOf(page)).toBe(page.used);
      expect(page.used).toBeLessThanOrEqual(CAPACITY);
    }
  });

  it('moves a code block that fits on a page to the next page instead of splitting it', () => {
    const before = Array.from({ length: 18 }, (_, i) => `Paragraph ${i}`).join('\n');
    const code = Array.from({ length: 12 }, (_, i) => `line_${i} = ${i}`).join('\n');
    const pages = paginate(`${before}\n\`\`\`py\n${code}\n\`\`\``);
    const codePages = pages.filter((p) => p.rows.some((r) => r.kind === 'code'));
    expect(codePages).toHaveLength(1);
    expect(codePages[0].rows[0].kind).toBe('fence');
  });

  it('continues a code block longer than a page on the next page, with a marker that is not article text', () => {
    const code = Array.from({ length: 80 }, (_, i) => `x${i}`).join('\n');
    const content = `\`\`\`go\n${code}\n\`\`\``;
    const pages = paginate(content);
    expect(pages.length).toBeGreaterThan(2);
    expect(pages[1].rows[0]).toMatchObject({ kind: 'cont', text: 'go (continued)', line: -1 });
    expect(joinPages(pages)).toBe(content);
  });

  it('keeps indentation, tabs and long code lines intact (long lines are cut into rows, not re-flowed)', () => {
    const long = `\t${'call(arg), '.repeat(20)}`;
    const pages = paginate(`\`\`\`js\n${long}\n\`\`\``);
    const rows = pages[0].rows.filter((r) => r.kind === 'code');
    expect(rows.length).toBeGreaterThan(1);
    expect(rows.map((r) => r.text).join('')).toBe(long);
    expect(rows[0].text.startsWith('\t')).toBe(true);
  });

  it('keeps a heading with the line that follows it', () => {
    const filler = Array.from({ length: 22 }, (_, i) => `p${i}`).join('\n');
    const pages = paginate(`${filler}\n## Next section\nIts first line`);
    const headingPage = pages.findIndex((p) => p.rows.some((r) => r.kind === 'h2'));
    expect(pages[headingPage].rows.some((r) => r.text === 'Its first line')).toBe(true);
  });

  it('classifies headings, lists, quotes and code', () => {
    const kinds = paginate('# A\n## B\n### C\n- item\n> q\ntext\n\n```\ncode\n```')[0].rows.map((r) => r.kind);
    expect(kinds).toEqual(['h1', 'h2', 'h3', 'li', 'quote', 'p', 'blank', 'fence', 'code', 'fence']);
  });
});

describe('caretOffset', () => {
  it('is zero on an empty page and grows with the last row', () => {
    expect(caretOffset({ rows: [], used: 0 }, 0.6)).toBe(0);
    const [page] = paginate('abc');
    expect(caretOffset(page, 0.6)).toBeCloseTo(3 * 14 * 0.6);
  });
});
