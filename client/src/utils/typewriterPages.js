// Lays the article's Markdown out on typewriter pages.
//
// This is ONLY a picture of the content: it never changes the Markdown. Every source line is cut into
// "rows" (what fits across the page); joining a line's rows gives back exactly that line. Rows are then
// stacked onto pages of a fixed height. Code blocks are kept on one page when they fit, and continue
// cleanly on the next page when they do not.
//
// All sizes are in the typewriter scene's own units (px at scale 1).

export const PAGE = {
  width: 470,
  height: 590,
  marginTop: 44,
  marginLeft: 40,
  marginBottom: 40,
  cols: 46, // characters per row at the body size
};
export const CAPACITY = PAGE.height - PAGE.marginTop - PAGE.marginBottom;

// Row styles: font size and row height (px), and how many characters fit across.
export const ROW_STYLE = {
  h1: { size: 21, height: 32 },
  h2: { size: 17.5, height: 27 },
  h3: { size: 14, height: 23 },
  p: { size: 14, height: 22 },
  li: { size: 14, height: 22 },
  quote: { size: 14, height: 22 },
  blank: { size: 14, height: 14 },
  fence: { size: 12.5, height: 20 },
  code: { size: 12.5, height: 19 },
  cont: { size: 11, height: 20 },
};
const colsFor = (kind) => Math.floor((PAGE.cols * ROW_STYLE.p.size) / ROW_STYLE[kind].size);
const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([\w+#.-]*)/;

// Tabs are shown as 4 spaces on paper (display only; the Markdown keeps its tabs).
const expandTabs = (text) => text.replace(/\t/g, '    ');

function classify(line) {
  const trimmed = line.trim();
  if (!trimmed) return { kind: 'blank', indent: 0 };
  const heading = /^ {0,3}(#{1,6})\s/.exec(line);
  if (heading) return { kind: heading[1].length === 1 ? 'h1' : heading[1].length === 2 ? 'h2' : 'h3', indent: 0 };
  const list = /^(\s*)([-*+]|\d{1,9}[.)])\s+/.exec(line);
  if (list) return { kind: 'li', indent: Math.min(list[0].length, 12) };
  if (/^ {0,3}>/.test(line)) return { kind: 'quote', indent: 0 };
  return { kind: 'p', indent: 0 };
}

// Prose: wrap at spaces (each row keeps its trailing space, so rows join back to the line).
// Continuation rows of a list item hang under the item's text.
function wrapProse(line, kind, indent) {
  const width = colsFor(kind);
  const rows = [];
  let rest = line;
  let first = true;
  while (rest.length > 0) {
    const avail = Math.max(8, width - (first ? 0 : indent));
    if (rest.length <= avail) {
      rows.push({ text: rest, indent: first ? 0 : indent });
      break;
    }
    let cut = rest.lastIndexOf(' ', avail);
    if (cut <= 0) cut = avail - 1; // one long word: break it
    rows.push({ text: rest.slice(0, cut + 1), indent: first ? 0 : indent });
    rest = rest.slice(cut + 1);
    first = false;
  }
  return rows.length ? rows : [{ text: '', indent: 0 }];
}

// Code: never re-flowed; long lines are cut at the row width and marked as continuing.
function wrapCode(line, kind) {
  const width = colsFor(kind);
  const shown = expandTabs(line);
  if (shown.length <= width) return [{ text: line, indent: 0 }];
  const rows = [];
  // cut the ORIGINAL text so the rows join back exactly (tabs counted as 4 columns)
  let start = 0;
  while (start < line.length) {
    let col = 0;
    let end = start;
    while (end < line.length) {
      const w = line[end] === '\t' ? 4 : 1;
      if (col + w > width) break;
      col += w;
      end += 1;
    }
    if (end === start) end = start + 1;
    rows.push({ text: line.slice(start, end), indent: 0, wrapped: end < line.length });
    start = end;
  }
  return rows;
}

// Splits the Markdown into blocks: a whole code block is one block; every other line is its own block.
function toBlocks(lines) {
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const open = FENCE.exec(lines[i]);
    if (!open) {
      blocks.push({ type: 'line', from: i, to: i });
      i += 1;
      continue;
    }
    const marker = open[1];
    let j = i + 1;
    while (j < lines.length) {
      const close = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(lines[j]);
      if (close && close[1][0] === marker[0] && close[1].length >= marker.length) break;
      j += 1;
    }
    const to = Math.min(j, lines.length - 1);
    blocks.push({ type: 'code', from: i, to, lang: open[2] || '' });
    i = to + 1;
  }
  return blocks;
}

function rowsForBlock(block, lines) {
  const rows = [];
  for (let n = block.from; n <= block.to; n += 1) {
    const line = lines[n];
    if (block.type === 'code') {
      const isFence = n === block.from || (n === block.to && n !== block.from && FENCE.test(line) && /^ {0,3}(`{3,}|~{3,})\s*$/.test(line));
      const kind = isFence ? 'fence' : 'code';
      wrapCode(line, kind).forEach((row, part) => rows.push({ ...row, kind, line: n, part }));
    } else {
      const { kind, indent } = classify(line);
      const pieces = kind === 'blank' ? [{ text: line, indent: 0 }] : wrapProse(line, kind, indent);
      pieces.forEach((row, part) => rows.push({ ...row, kind, line: n, part }));
    }
  }
  return rows;
}

const heightOf = (rows) => rows.reduce((sum, row) => sum + ROW_STYLE[row.kind].height, 0);

// Returns [{ rows: [{ kind, text, indent, line, part }], used }]: always at least one (possibly empty) page.
export function paginate(content) {
  const lines = (content ?? '').split('\n');
  const blocks = content ? toBlocks(lines) : [];
  const pages = [{ rows: [], used: 0 }];
  let page = pages[0];
  const newPage = () => {
    page = { rows: [], used: 0 };
    pages.push(page);
  };
  const place = (row) => {
    const h = ROW_STYLE[row.kind].height;
    if (page.used + h > CAPACITY && page.rows.length > 0) newPage();
    page.rows.push(row);
    page.used += h;
  };

  blocks.forEach((block, b) => {
    const rows = rowsForBlock(block, lines);
    const total = heightOf(rows);
    const remaining = CAPACITY - page.used;

    if (block.type === 'code') {
      // Keep a code block together when it fits on a page; otherwise start it on a fresh page
      // unless this page still has a good amount of room.
      if (total > remaining && page.rows.length > 0 && (total <= CAPACITY || remaining < CAPACITY * 0.3)) newPage();
      rows.forEach((row) => {
        if (page.used + ROW_STYLE[row.kind].height > CAPACITY && page.rows.length > 0) {
          newPage();
          // a visual marker only (not part of the article): the code continues from the last page
          const cont = { kind: 'cont', text: `${block.lang || 'code'} (continued)`, indent: 0, line: -1, part: 0 };
          page.rows.push(cont);
          page.used += ROW_STYLE.cont.height;
        }
        place(row);
      });
      return;
    }

    // Headings stay with the line after them.
    const isHeading = rows[0] && rows[0].kind.startsWith('h');
    const next = blocks[b + 1];
    if (isHeading && next && page.rows.length > 0 && total + ROW_STYLE.p.height > remaining) newPage();
    rows.forEach(place);
  });

  return pages;
}

// Where the carriage stands on a page: the column after the last character of its last row,
// in scene px (each row style has its own character width).
export function caretOffset(page, charRatio) {
  const last = page.rows[page.rows.length - 1];
  if (!last) return 0;
  const size = ROW_STYLE[last.kind].size;
  const shown = last.kind === 'code' || last.kind === 'fence' ? expandTabs(last.text) : last.text;
  return (last.indent + shown.length) * size * charRatio;
}

// Rebuilds the Markdown from the pages (used by the tests to prove nothing is lost or reordered).
export function joinPages(pages) {
  const lines = [];
  for (const page of pages) {
    for (const row of page.rows) {
      if (row.line < 0) continue;
      lines[row.line] = (lines[row.line] ?? '') + row.text;
    }
  }
  return lines.map((l) => l ?? '').join('\n');
}

export { expandTabs };
