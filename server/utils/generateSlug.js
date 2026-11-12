import crypto from 'crypto';
import Post from '../models/Post.js';

// "mine" is a real API route (GET /api/posts/mine) and "about" is a page of every publication
// website (/p/<publication>/about), so an article must never get either slug.
const RESERVED_SLUGS = ['mine', 'about'];

// "Building a REST API with Express!" -> "building-a-rest-api-with-express"
// `fallback` is what you get when nothing usable is left (e.g. a title like "!!!").
export const slugify = (text, fallback = 'post') => {
  const slug = text
    .normalize('NFKD') // split "é" into "e" + accent mark...
    .replace(/[̀-ͯ]/g, '') // ...then drop the accent marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // anything that is not a letter/digit becomes "-"
    .replace(/^-+|-+$/g, ''); // no "-" at the start or end
  return slug || fallback;
};

// Returns a slug that no existing post uses. If "my-post" is taken we try
// "my-post-a1b2c3", "my-post-d4e5f6", ... until we find a free one.
export const generateUniqueSlug = async (title) => {
  const base = slugify(title);
  let slug = base;

  while (RESERVED_SLUGS.includes(slug) || (await Post.exists({ slug }))) {
    slug = `${base}-${crypto.randomBytes(3).toString('hex')}`;
  }
  return slug;
};
