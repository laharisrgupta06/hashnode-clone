import crypto from 'crypto';
import Tag from '../models/Tag.js';
import { slugify } from './generateSlug.js';

// Limits so that one user cannot flood the database with tags. The PRD sets no numbers,
// so these are easy to change here.
export const MAX_TAGS_PER_POST = 10;
export const MAX_TAG_LENGTH = 30;

// Checks the `tags` value from a request body and cleans it up.
// Returns { names: [...] } when valid, or { error: 'message' } when not.
//   [" JavaScript", "javascript", "Node  JS"]  ->  { names: ["javascript", "node js"] }
export const normalizeTagNames = (input) => {
  if (!Array.isArray(input)) return { error: 'Tags must be an array of strings' };

  const names = [];
  for (const item of input) {
    if (typeof item !== 'string') return { error: 'Each tag must be a string' };

    // trim, collapse repeated spaces, lowercase (the Tag model stores names lowercase)
    const name = item.trim().replace(/\s+/g, ' ').toLowerCase();

    if (!name) return { error: 'Tags cannot be empty' };
    if (name.length > MAX_TAG_LENGTH) return { error: `A tag can have at most ${MAX_TAG_LENGTH} characters` };
    // A tag also needs a URL slug (/tag/:slug), so it must contain at least one letter or digit.
    if (!slugify(name, '')) return { error: 'A tag must contain at least one letter or number' };

    if (!names.includes(name)) names.push(name); // silently drop duplicates inside one request
  }

  if (names.length > MAX_TAGS_PER_POST) return { error: `A post can have at most ${MAX_TAGS_PER_POST} tags` };
  return { names };
};

// Returns the id of the tag with this name, creating the tag if it does not exist yet.
const findOrCreateTag = async (name) => {
  // Up to 3 tries, because two requests can create the same tag at the same moment:
  // the loser gets a duplicate-key error, then finds the winner's tag on the next try.
  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = await Tag.findOne({ name });
    if (existing) return existing._id;

    // Different names can give the same slug ("c++" and "c#" both -> "c").
    // Slugs must be unique, so the later one gets a random suffix.
    const base = slugify(name, '');
    let slug = base;
    while (await Tag.exists({ slug })) {
      slug = `${base}-${crypto.randomBytes(3).toString('hex')}`;
    }

    try {
      const tag = await Tag.create({ name, slug });
      return tag._id;
    } catch (error) {
      if (error.code !== 11000) throw error; // 11000 = duplicate key; anything else is a real error
    }
  }

  const error = new Error('Could not save tags, please try again');
  error.status = 409;
  throw error;
};

// Takes the cleaned names from normalizeTagNames and returns an array of Tag ids,
// in the same order, creating any tags that do not exist yet.
export const findOrCreateTags = async (names) => {
  const ids = [];
  for (const name of names) ids.push(await findOrCreateTag(name));
  return ids;
};
