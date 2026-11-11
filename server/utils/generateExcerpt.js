const MAX_LENGTH = 250; // matches the maxlength on Post.excerpt

// Turns Markdown into a short plain-text preview for the feed cards.
// This is a simple cleanup, not a full Markdown parser.
const generateExcerpt = (markdown) => {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/<[^>]*>/g, ' ') // raw HTML tags
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links: keep only the link text
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '') // heading / quote / list markers
    .replace(/[`*_~]/g, '') // inline code, bold, italic, strikethrough marks
    .replace(/\s+/g, ' ') // collapse whitespace and new lines
    .trim();

  if (text.length <= MAX_LENGTH) return text;
  return text.slice(0, MAX_LENGTH - 1).trimEnd() + '…'; // 249 chars + "…" = 250
};

export default generateExcerpt;
