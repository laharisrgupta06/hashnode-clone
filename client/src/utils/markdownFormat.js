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

export const FORMATS = {
  bold: (text, start, end) => wrap(text, start, end, '**', 'bold text'),
  italic: (text, start, end) => wrap(text, start, end, '_', 'italic text'),
  code: (text, start, end) => wrap(text, start, end, '`', 'code'),

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

  codeBlock: (text, start, end) => {
    const selected = text.slice(start, end) || 'code';
    // A fence must start on its own line.
    const before = start > 0 && text[start - 1] !== '\n' ? '\n' : '';
    const after = end < text.length && text[end] !== '\n' ? '\n' : '';
    const opening = `${before}\`\`\`javascript\n`;
    const insert = `${opening}${selected}\n\`\`\`${after}`;
    // Select the language name, the part users most often want to change.
    const langStart = start + before.length + 3;
    return { from: start, to: end, insert, selectStart: langStart, selectEnd: langStart + 'javascript'.length };
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
