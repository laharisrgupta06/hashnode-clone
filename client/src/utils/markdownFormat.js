import { ANY_INLINE_TOKEN, divOpen, markOpen, parseToken, spanOpen } from './richFormat.js';

// Toolbar formatting as pure functions (easy to test). Each takes the textarea's text and selection
// and returns ONE replacement:
//   { from, to, insert, selectStart, selectEnd }
// meaning: replace text[from..to) with `insert`, then select selectStart..selectEnd in the NEW text.
// The editor applies it through the browser's own edit command, so Ctrl/Cmd+Z undo still works.

// Wraps the selection, e.g. **bold**. With nothing selected it inserts a placeholder and selects it,
// so the user can type straight over it.
function wrap(text, start, end, marker, placeholder, closing = marker) {
  const selected = text.slice(start, end);
  const inner = selected || placeholder;
  return {
    from: start,
    to: end,
    insert: `${marker}${inner}${closing}`,
    selectStart: start + marker.length,
    selectEnd: start + marker.length + inner.length,
  };
}

// The start of the line the cursor is on, and the end of the line the selection ends on.
function lineBounds(text, start, end) {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  let lineEnd = text.indexOf('\n', end);
  if (lineEnd === -1) lineEnd = text.length;
  return { lineStart, lineEnd };
}

// Adds a prefix to every selected line ("- ", "> ", "1. "). Applying it again removes it (toggle).
// `replaces` = other markers this one swaps out (switching a bulleted list to numbered must not
// produce "1. - item").
function prefixLines(text, start, end, makePrefix, matcher, replaces = matcher) {
  const { lineStart, lineEnd } = lineBounds(text, start, end);
  const lines = text.slice(lineStart, lineEnd).split('\n');
  const allPrefixed = lines.every((line) => matcher.test(line));
  const changed = allPrefixed ? lines.map((line) => line.replace(matcher, '')) : lines.map((line, i) => makePrefix(i) + line.replace(replaces, ''));
  const insert = changed.join('\n');
  return { from: lineStart, to: lineEnd, insert, selectStart: lineStart, selectEnd: lineStart + insert.length };
}

const LIST_MARKER = /^([-*+]|\d+\.) /;

// ---------- toggles and the DevPress formatting extensions (see utils/richFormat.js) ----------

// Wraps the selection, or removes the markers when the selection is already wrapped by them
// (markers just outside the selection, or the selection itself starting and ending with them).
function toggleWrap(text, start, end, open, close, placeholder) {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const selected = text.slice(start, end);
  if (before.endsWith(open) && after.startsWith(close)) {
    const from = start - open.length;
    return { from, to: end + close.length, insert: selected, selectStart: from, selectEnd: from + selected.length };
  }
  if (selected.length >= open.length + close.length && selected.startsWith(open) && selected.endsWith(close)) {
    const inner = selected.slice(open.length, selected.length - close.length);
    return { from: start, to: end, insert: inner, selectStart: start, selectEnd: start + inner.length };
  }
  return wrap(text, start, end, open, placeholder, close);
}

// Applies, changes or removes (value = '') one formatting tag around the selection.
// `openPattern` matches any opening tag of that kind; `makeOpen(value)` builds the new one.
function setTag(text, start, end, openPattern, close, makeOpen, value, placeholder) {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const selected = text.slice(start, end);
  const around = new RegExp(`${openPattern}$`).exec(before);
  if (around && after.startsWith(close)) {
    const openStart = start - around[0].length;
    if (!value) return { from: openStart, to: end + close.length, insert: selected, selectStart: openStart, selectEnd: openStart + selected.length };
    const open = makeOpen(value);
    return { from: openStart, to: start, insert: open, selectStart: openStart + open.length, selectEnd: openStart + open.length + selected.length };
  }
  const whole = new RegExp(`^${openPattern}([\\s\\S]*)${close.replace('/', '\\/')}$`).exec(selected);
  if (whole) {
    const inner = whole[1];
    if (!value) return { from: start, to: end, insert: inner, selectStart: start, selectEnd: start + inner.length };
    const open = makeOpen(value);
    return { from: start, to: end, insert: open + inner + close, selectStart: start + open.length, selectEnd: start + open.length + inner.length };
  }
  if (!value) return null;
  return wrap(text, start, end, makeOpen(value), placeholder, close);
}

const spanFormat = (kind) => (text, start, end, value) => setTag(text, start, end, `<span data-${kind}="[a-z]+">`, '</span>', (v) => spanOpen(kind, v), value, 'text');

function setBlockStyle(text, start, end, level) {
  const { lineStart, lineEnd } = lineBounds(text, start, end);
  const lines = text.slice(lineStart, lineEnd).split('\n');
  const insert = lines.map((line) => (level ? `${'#'.repeat(level)} ` : '') + line.replace(/^#{1,6} /, '')).join('\n');
  return { from: lineStart, to: lineEnd, insert, selectStart: lineStart, selectEnd: lineStart + insert.length };
}

const LIST_LINE = /^(\s*)([-*+]|\d+\.) /;
function shiftListLines(text, start, end, direction) {
  const { lineStart, lineEnd } = lineBounds(text, start, end);
  const lines = text.slice(lineStart, lineEnd).split('\n');
  if (!lines.some((line) => LIST_LINE.test(line))) return null; // indentation only exists for list items in Markdown
  const changed = lines.map((line) => {
    if (!LIST_LINE.test(line)) return line;
    return direction > 0 ? `    ${line}` : line.replace(/^ {1,4}/, '');
  });
  const insert = changed.join('\n');
  if (insert === lines.join('\n')) return null;
  return { from: lineStart, to: lineEnd, insert, selectStart: lineStart, selectEnd: lineStart + insert.length };
}

function setAlign(text, start, end, value) {
  const { lineStart, lineEnd } = lineBounds(text, start, end);
  const before = text.slice(0, lineStart);
  const after = text.slice(lineEnd);
  const content = text.slice(lineStart, lineEnd);
  const opening = /<div data-align="[a-z]+">\n\n$/.exec(before);
  const closing = /^\n\n<\/div>/.exec(after);
  if (opening && closing) {
    const from = lineStart - opening[0].length;
    const to = lineEnd + closing[0].length;
    if (!value) return { from, to, insert: content, selectStart: from, selectEnd: from + content.length };
    const open = `${divOpen(value)}\n\n`;
    return { from, to, insert: open + content + closing[0], selectStart: from + open.length, selectEnd: from + open.length + content.length };
  }
  if (!value) return null;
  const open = `${divOpen(value)}\n\n`;
  // the closing line needs a blank line after it; add a line break only if one is missing
  const close = `\n\n</div>${after.length && !after.startsWith('\n\n') ? '\n' : ''}`;
  return { from: lineStart, to: lineEnd, insert: open + content + close, selectStart: lineStart + open.length, selectEnd: lineStart + open.length + content.length };
}

// The Markdown link around a position: { start, end, label, url, urlStart } or null (images excluded).
export function linkAt(text, pos) {
  const { lineStart, lineEnd } = lineBounds(text, pos, pos);
  const line = text.slice(lineStart, lineEnd);
  for (const m of line.matchAll(/(!?)\[([^\]\n]*)\]\(([^)\s]*)\)/g)) {
    const start = lineStart + m.index;
    const end = start + m[0].length;
    if (m[1] === '!' || pos < start || pos > end) continue;
    return { start, end, label: m[2], url: m[3], urlStart: start + m[2].length + 3 };
  }
  return null;
}

// The fenced code block a position is inside: { fenceStart, langStart, langEnd, lang } or null.
export function fenceAt(text, pos) {
  let open = null;
  let offset = 0;
  for (const line of text.split('\n')) {
    const lineEnd = offset + line.length;
    const fence = /^ {0,3}(`{3,}|~{3,})\s*([\w+#.-]*)/.exec(line);
    if (fence) {
      if (!open) open = { fenceStart: offset, langStart: offset + line.indexOf(fence[1]) + fence[1].length, lang: fence[2], marker: fence[1] };
      else if (/^ {0,3}(`{3,}|~{3,})\s*$/.test(line) && fence[1][0] === open.marker[0]) {
        if (pos >= open.fenceStart && pos <= lineEnd) return { ...open, langEnd: open.langStart + open.lang.length };
        open = null;
      }
    }
    offset = lineEnd + 1;
  }
  return open && pos >= open.fenceStart ? { ...open, langEnd: open.langStart + open.lang.length } : null;
}

// Removes inline formatting (DevPress tags, bold, italic, strikethrough) from the selection,
// including markers directly around it. Headings and lists are left alone.
const AROUND = [
  [/<u>$/, '</u>'],
  [/<mark(?: data-highlight="[a-z]+")?>$/, '</mark>'],
  [/<span data-(?:color|font|size)="[a-z]+">$/, '</span>'],
  [/\*\*$/, '**'],
  [/~~$/, '~~'],
  [/(^|[^_])_$/, '_'],
];
function clearFormatting(text, start, end) {
  let from = start;
  let to = end;
  for (let grown = true; grown; ) {
    grown = false;
    for (const [open, close] of AROUND) {
      const m = open.exec(text.slice(0, from));
      if (m && text.slice(to).startsWith(close)) {
        const markerLength = m[0].length - (m[1] ? m[1].length : 0);
        from -= markerLength;
        to += close.length;
        grown = true;
      }
    }
  }
  const original = text.slice(from, to);
  const insert = original
    .replace(ANY_INLINE_TOKEN, '')
    .replace(/\*\*|~~/g, '')
    .replace(/(^|[^\w_])_([^_\n]+)_(?=[^\w_]|$)/g, '$1$2');
  if (insert === original) return null;
  return { from, to, insert, selectStart: from, selectEnd: from + insert.length };
}

export const FORMATS = {
  bold: (text, start, end) => toggleWrap(text, start, end, '**', '**', 'bold text'),
  italic: (text, start, end) => toggleWrap(text, start, end, '_', '_', 'italic text'),
  code: (text, start, end) => toggleWrap(text, start, end, '`', '`', 'code'),
  underline: (text, start, end) => toggleWrap(text, start, end, '<u>', '</u>', 'underlined text'),
  strikethrough: (text, start, end) => toggleWrap(text, start, end, '~~', '~~', 'struck text'),

  // value '' removes; any other value must come from the curated lists in utils/richFormat.js
  color: spanFormat('color'),
  font: spanFormat('font'),
  size: spanFormat('size'),
  highlight: (text, start, end, value) => setTag(text, start, end, '<mark(?: data-highlight="[a-z]+")?>', '</mark>', markOpen, value, 'highlighted text'),
  align: (text, start, end, value) => setAlign(text, start, end, value),
  clear: (text, start, end) => clearFormatting(text, start, end),

  paragraph: (text, start, end) => setBlockStyle(text, start, end, 0),
  heading1: (text, start, end) => setBlockStyle(text, start, end, 1),
  heading2: (text, start, end) => setBlockStyle(text, start, end, 2),
  heading3: (text, start, end) => setBlockStyle(text, start, end, 3),
  indent: (text, start, end) => shiftListLines(text, start, end, 1),
  outdent: (text, start, end) => shiftListLines(text, start, end, -1),

  separator: (text, start, end) => {
    const { lineEnd } = lineBounds(text, start, end);
    const insert = '\n\n---\n';
    return { from: lineEnd, to: lineEnd, insert, selectStart: lineEnd + insert.length, selectEnd: lineEnd + insert.length };
  },

  // With the cursor in a link: select its address for editing. Otherwise: a new link.
  editLink: (text, start, end) => {
    const link = linkAt(text, start);
    if (!link) return FORMATS.link(text, start, end);
    return { from: link.urlStart, to: link.urlStart + link.url.length, insert: link.url, selectStart: link.urlStart, selectEnd: link.urlStart + link.url.length };
  },
  removeLink: (text, start) => {
    const link = linkAt(text, start);
    if (!link) return null;
    return { from: link.start, to: link.end, insert: link.label, selectStart: link.start, selectEnd: link.start + link.label.length };
  },

  image: (text, start, end, value) => {
    const { url, alt } = value ?? {};
    if (!url) return null;
    const before = start > 0 && text[start - 1] !== '\n' ? '\n\n' : '';
    const after = end < text.length && text[end] !== '\n' ? '\n\n' : '';
    const insert = `${before}![${(alt || 'image').replace(/[[\]]/g, '')}](${url})${after}`;
    return { from: start, to: end, insert, selectStart: start + insert.length, selectEnd: start + insert.length };
  },

  link: (text, start, end) => {
    const label = text.slice(start, end) || 'link text';
    const insert = `[${label}](https://)`;
    // Select the URL part so the user can paste the address immediately.
    const urlStart = start + label.length + 3;
    return { from: start, to: end, insert, selectStart: urlStart, selectEnd: urlStart + 'https://'.length };
  },

  heading: (text, start, end) => prefixLines(text, start, end, () => '## ', /^#{1,6} /),
  quote: (text, start, end) => prefixLines(text, start, end, () => '> ', /^> ?/),
  bulletList: (text, start, end) => prefixLines(text, start, end, () => '- ', /^[-*+] /, LIST_MARKER),
  numberedList: (text, start, end) => prefixLines(text, start, end, (i) => `${i + 1}. `, /^\d+\. /, LIST_MARKER),

  codeBlock: (text, start, end, language) => {
    const inside = language ? fenceAt(text, start) : null;
    if (inside) {
      // the cursor is in a code block: change its language
      return { from: inside.langStart, to: inside.langEnd, insert: language, selectStart: inside.langStart, selectEnd: inside.langStart + language.length };
    }
    const lang = language || 'javascript';
    const selected = text.slice(start, end) || 'code';
    // A fence must start on its own line.
    const before = start > 0 && text[start - 1] !== '\n' ? '\n' : '';
    const after = end < text.length && text[end] !== '\n' ? '\n' : '';
    const opening = `${before}\`\`\`${lang}\n`;
    const insert = `${opening}${selected}\n\`\`\`${after}`;
    // Select the language name, the part users most often want to change.
    const langStart = start + before.length + 3;
    return { from: start, to: end, insert, selectStart: langStart, selectEnd: langStart + lang.length };
  },
};

// Applies an edit to a real textarea. execCommand('insertText') keeps the browser's undo history;
// if a browser does not support it, setRangeText is used (undo then skips this step).
export function applyEdit(textarea, edit) {
  textarea.focus();
  textarea.setSelectionRange(edit.from, edit.to);
  let inserted = false;
  try {
    inserted = document.execCommand?.('insertText', false, edit.insert) ?? false;
  } catch {
    inserted = false;
  }
  if (!inserted) {
    textarea.setRangeText(edit.insert, edit.from, edit.to, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true })); // tells React the value changed
  }
  textarea.setSelectionRange(edit.selectStart, edit.selectEnd);
}

// What formatting is active at the selection, for the toolbar's pressed buttons and dropdowns.
export function formatState(text, start, end) {
  const { lineStart } = lineBounds(text, start, start);
  const lineEndIndex = text.indexOf('\n', start);
  const line = text.slice(lineStart, lineEndIndex === -1 ? text.length : lineEndIndex);
  const before = text.slice(0, start);
  const after = text.slice(end);
  const selected = text.slice(start, end);
  const wrapped = (open, close) => (before.endsWith(open) && after.startsWith(close)) || (selected.length > open.length + close.length && selected.startsWith(open) && selected.endsWith(close));

  const heading = /^(#{1,6}) /.exec(line);
  const state = {
    block: heading ? `heading${Math.min(heading[1].length, 3)}` : 'paragraph',
    bulletList: /^\s*[-*+] /.test(line),
    numberedList: /^\s*\d+\. /.test(line),
    quote: /^> ?/.test(line),
    bold: wrapped('**', '**'),
    italic: wrapped('_', '_') && !wrapped('__', '__'),
    underline: wrapped('<u>', '</u>'),
    strikethrough: wrapped('~~', '~~'),
    code: wrapped('`', '`') && !wrapped('``', '``'),
    color: '',
    highlight: '',
    font: '',
    size: '',
    align: '',
    link: Boolean(linkAt(text, start)),
    codeLanguage: fenceAt(text, start)?.lang ?? null,
  };

  // Formatting tags still open at the cursor, within the current paragraph.
  const paragraphStart = Math.max(0, text.lastIndexOf('\n\n', start - 1));
  const stack = [];
  for (const m of text.slice(paragraphStart, start).matchAll(/<\/?(?:u|mark|span)\b[^>\n]*>/g)) {
    const token = parseToken(m[0]);
    if (!token) continue;
    if (token.open) stack.push(token);
    else {
      const index = stack.map((t) => t.tag).lastIndexOf(token.tag);
      if (index >= 0) stack.length = index;
    }
  }
  for (const token of stack) {
    if (token.tag === 'u') state.underline = true;
    else if (token.kind) state[token.kind] = token.value;
  }

  // Inside an alignment block?
  const lastOpen = before.lastIndexOf('<div data-align="');
  if (lastOpen >= 0 && before.indexOf('</div>', lastOpen) === -1) {
    const token = parseToken(before.slice(lastOpen, before.indexOf('>', lastOpen) + 1));
    if (token?.kind === 'align') state.align = token.value;
  }
  return state;
}
