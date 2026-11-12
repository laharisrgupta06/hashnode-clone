// DevPress formatting extensions to Markdown.
//
// Articles are stored as Markdown. Markdown has no underline, colour, highlight, font or alignment,
// so DevPress accepts a SMALL, FIXED set of tags for those, written exactly as below:
//
//   <u>text</u>                              underline
//   <mark>text</mark>                        highlight (yellow)
//   <mark data-highlight="green">text</mark> highlight in a curated colour
//   <span data-color="rust">text</span>      text colour from the curated palette
//   <span data-font="serif">text</span>      font family: serif | sans | mono
//   <span data-size="large">text</span>      font size: small | large | xlarge
//   <div data-align="center">                alignment of the blocks between the two lines
//
//   ...paragraphs...
//
//   </div>
//
// These are matched as EXACT strings (see remarkDevpressFormat). No HTML is ever parsed, so
// anything else that looks like HTML (other tags, other attributes, other values, scripts,
// styles, event handlers) is shown as plain text, never rendered.

export const TEXT_COLORS = [
  { value: 'rust', label: 'Rust red' },
  { value: 'amber', label: 'Amber' },
  { value: 'forest', label: 'Forest green' },
  { value: 'ocean', label: 'Ocean blue' },
  { value: 'plum', label: 'Plum' },
  { value: 'slate', label: 'Slate grey' },
];
export const HIGHLIGHTS = [
  { value: 'yellow', label: 'Yellow' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'pink', label: 'Pink' },
];
export const FONTS = [
  { value: 'serif', label: 'Serif' },
  { value: 'sans', label: 'Sans serif' },
  { value: 'mono', label: 'Monospace' },
];
export const SIZES = [
  { value: 'small', label: 'Small' },
  { value: 'large', label: 'Large' },
  { value: 'xlarge', label: 'Extra large' },
];
export const ALIGNMENTS = [
  { value: 'center', label: 'Centre' },
  { value: 'right', label: 'Right' },
];

const values = (list) => list.map((item) => item.value);
export const SPAN_KINDS = {
  color: values(TEXT_COLORS),
  font: values(FONTS),
  size: values(SIZES),
};
export const HIGHLIGHT_VALUES = values(HIGHLIGHTS);
export const ALIGN_VALUES = values(ALIGNMENTS);

export const spanOpen = (kind, value) => `<span data-${kind}="${value}">`;
export const markOpen = (value) => (value && value !== 'yellow' ? `<mark data-highlight="${value}">` : '<mark>');
export const divOpen = (value) => `<div data-align="${value}">`;

// Reads one exact token. Returns { open: true|false, tag, kind?, value? } or null (not allowed).
export function parseToken(raw) {
  const text = raw.trim();
  let m;
  if (text === '<u>') return { open: true, tag: 'u' };
  if ((m = /^<mark(?: data-highlight="([a-z]+)")?>$/.exec(text))) {
    const value = m[1] ?? 'yellow';
    return HIGHLIGHT_VALUES.includes(value) ? { open: true, tag: 'mark', kind: 'highlight', value } : null;
  }
  if ((m = /^<span data-(color|font|size)="([a-z]+)">$/.exec(text))) {
    return SPAN_KINDS[m[1]].includes(m[2]) ? { open: true, tag: 'span', kind: m[1], value: m[2] } : null;
  }
  if ((m = /^<div data-align="([a-z]+)">$/.exec(text))) {
    return ALIGN_VALUES.includes(m[1]) ? { open: true, tag: 'div', kind: 'align', value: m[1] } : null;
  }
  if ((m = /^<\/(u|mark|span|div)>$/.exec(text))) return { open: false, tag: m[1] };
  return null;
}

// Every allowed token, for removing formatting ("Clear formatting").
export const ANY_INLINE_TOKEN = /<u>|<\/u>|<mark(?: data-highlight="[a-z]+")?>|<\/mark>|<span data-(?:color|font|size)="[a-z]+">|<\/span>/g;
