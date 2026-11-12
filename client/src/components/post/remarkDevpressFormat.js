import { parseToken } from '../../utils/richFormat.js';

// remark plugin: turns DevPress's allowlisted formatting tags (utils/richFormat.js) into elements.
//
// Markdown keeps raw HTML as `html` nodes. For every parent, its html children are matched as
// EXACT allowlisted strings, opening and closing tags are paired (like brackets, innermost first),
// and the nodes between a pair are wrapped in the corresponding element. Every html node that is
// not part of a valid pair (another tag, an attribute or value not on the list, a tag that is
// never closed, a script...) becomes plain text and is shown as typed. No HTML is ever parsed.

const PHRASING_PARENTS = new Set(['paragraph', 'heading', 'emphasis', 'strong', 'delete', 'link', 'linkReference', 'tableCell', 'devpressInline']);

function wrapperFor(token, children) {
  const properties = {};
  if (token.kind === 'highlight') properties.dataHighlight = token.value;
  else if (token.kind === 'align') properties.dataAlign = token.value;
  else if (token.kind) properties[`data${token.kind[0].toUpperCase()}${token.kind.slice(1)}`] = token.value;
  return {
    type: token.tag === 'div' ? 'devpressBlock' : 'devpressInline',
    data: { hName: token.tag, hProperties: properties },
    children,
  };
}

// Raw html that is not a valid pair is kept visible as text (inside a paragraph at block level).
function asText(node, phrasing) {
  const text = { type: 'text', value: node.value, position: node.position };
  return phrasing ? text : { type: 'paragraph', children: [text], position: node.position };
}

function processLevel(parent) {
  const phrasing = PHRASING_PARENTS.has(parent.type);
  const out = [];
  const stack = []; // { token, at }
  for (const node of parent.children) {
    if (node.type !== 'html') {
      out.push(node);
      continue;
    }
    const token = parseToken(node.value);
    // Inline tags belong inside text; alignment blocks belong between blocks.
    const fits = token && (token.tag === 'div' ? !phrasing : phrasing);
    if (!fits) {
      out.push(asText(node, phrasing));
      continue;
    }
    if (token.open) {
      stack.push({ token, at: out.length });
      out.push(node); // placeholder until its closing tag is found
      continue;
    }
    // closing tag: pair it with the nearest open tag of the same name
    let index = stack.length - 1;
    while (index >= 0 && stack[index].token.tag !== token.tag) index -= 1;
    if (index < 0) {
      out.push(asText(node, phrasing));
      continue;
    }
    const { token: opening, at } = stack[index];
    stack.length = index; // tags opened inside and never closed stay as text (handled below)
    const children = out.splice(at + 1);
    out.splice(at, 1, wrapperFor(opening, children));
  }
  // open tags without a closing tag, and leftovers inside wrapped content, become text
  parent.children = out.map((node) => (node.type === 'html' ? asText(node, phrasing) : node));
  for (const child of parent.children) {
    if (Array.isArray(child.children)) processLevel(child);
  }
}

export default function remarkDevpressFormat() {
  return (tree) => {
    processLevel(tree);
  };
}
