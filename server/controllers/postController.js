import mongoose from 'mongoose';
import Post from '../models/Post.js';
import Tag from '../models/Tag.js';
// populate() looks models up by name, so the User model must have been loaded (registered) somewhere.
import '../models/User.js';
import { generateUniqueSlug } from '../utils/generateSlug.js';
import generateExcerpt from '../utils/generateExcerpt.js';
import { normalizeTagNames, findOrCreateTags } from '../utils/resolveTags.js';

// What we show about an author on public pages. Never the email or password.
const PUBLIC_AUTHOR_FIELDS = 'name avatarUrl';
const TAG_FIELDS = 'name slug';

// Small helper: set the HTTP status, then throw. errorMiddleware turns it into JSON.
const fail = (res, status, message) => {
  res.status(status);
  throw new Error(message);
};

const isHttpUrl = (value) => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

// Checks the request body and returns ONLY the fields we allow the client to set.
// Anything else in the body (author, slug, _id, ...) is ignored, so clients cannot
// forge an author or overwrite a slug.
// isCreate = true: title and content are required. false (update): only validate what was sent.
// `tags` (an array of tag NAMES) is only validated here and returned as `tagNames`.
// Creating the tags in the database happens later (resolveTagIds), after ALL validation passed,
// so a rejected request never leaves new tags behind.
const buildPostData = (body, res, isCreate) => {
  const data = {};

  if (isCreate || body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) fail(res, 400, 'Title is required');
    data.title = body.title.trim();
  }

  if (isCreate || body.content !== undefined) {
    if (typeof body.content !== 'string' || !body.content.trim()) fail(res, 400, 'Content is required');
    data.content = body.content;
    data.excerpt = generateExcerpt(body.content);
  }

  if (body.coverImage !== undefined) {
    if (typeof body.coverImage !== 'string') fail(res, 400, 'Cover image must be a URL string');
    const url = body.coverImage.trim();
    // Empty = no cover image. Otherwise it must be an http(s) URL (blocks javascript: etc.).
    if (url && !isHttpUrl(url)) fail(res, 400, 'Cover image must be a valid http(s) URL');
    data.coverImage = url;
  }

  if (body.status !== undefined) {
    if (!['draft', 'published'].includes(body.status)) fail(res, 400, "Status must be 'draft' or 'published'");
    data.status = body.status;
  }

  // On update, leaving `tags` out keeps the current tags; sending [] removes them all.
  if (body.tags !== undefined) {
    const { names, error } = normalizeTagNames(body.tags);
    if (error) fail(res, 400, error);
    data.tagNames = names;
  }

  return data;
};

// Splits `tagNames` out of the validated data and swaps it for real Tag ids (find-or-create).
const resolveTagIds = async (data) => {
  const { tagNames, ...fields } = data;
  if (tagNames) fields.tags = await findOrCreateTags(tagNames);
  return fields;
};

// Makes sure :id looks like a MongoDB id, otherwise Mongoose would throw a CastError (500).
const checkId = (id, res) => {
  if (!mongoose.isValidObjectId(id)) fail(res, 400, 'Invalid post id');
};

// Loads a post by id and verifies the logged-in user is its author.
// 404 = no such post, 403 = it exists but belongs to someone else.
const getOwnedPost = async (req, res) => {
  checkId(req.params.id, res);
  const post = await Post.findById(req.params.id);
  if (!post) fail(res, 404, 'Post not found');
  if (post.author.toString() !== req.user._id.toString()) {
    fail(res, 403, 'Not authorized: you can only modify your own posts');
  }
  return post;
};

// Published posts matching `extraFilter`, newest first, for feed-style lists.
// The full Markdown content is left out (cards don't need it). Also used by the tag routes.
export const findPublishedPosts = (extraFilter = {}) =>
  Post.find({ ...extraFilter, status: 'published' }) // status last: callers cannot override it
    .select('-content')
    .populate('author', PUBLIC_AUTHOR_FIELDS)
    .populate('tags', TAG_FIELDS)
    .sort({ createdAt: -1 });

// GET /api/posts   (public)   query: ?search=keyword  &tag=tag-slug   (both optional, combinable)
// Published posts only, newest first.
export const getPosts = async (req, res) => {
  const filter = {};

  if (req.query.tag !== undefined) {
    if (typeof req.query.tag !== 'string') fail(res, 400, 'Tag must be a single text value');
    const tagSlug = req.query.tag.trim().toLowerCase();
    if (tagSlug) {
      const tag = await Tag.findOne({ slug: tagSlug });
      if (!tag) return res.json({ posts: [] }); // unknown tag: nothing can match
      filter.tags = tag._id;
    }
  }

  if (req.query.search !== undefined) {
    if (typeof req.query.search !== 'string') fail(res, 400, 'Search must be a single text value');
    const term = req.query.search.trim();
    if (term) {
      // Escape characters that have a special meaning in regular expressions,
      // so "c++" or "(" is searched as plain text and cannot break the query.
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = { $regex: escaped, $options: 'i' }; // 'i' = ignore upper/lower case
    }
  }

  const posts = await findPublishedPosts(filter);

  res.json({ posts });
};

// GET /api/posts/mine   (protected)   all of MY posts, drafts included
export const getMyPosts = async (req, res) => {
  const posts = await Post.find({ author: req.user._id })
    .select('-content')
    .populate('tags', TAG_FIELDS)
    .sort({ createdAt: -1 });

  res.json({ posts });
};

// GET /api/posts/id/:id   (protected, owner)   full post for the editor, drafts included
export const getPostById = async (req, res) => {
  const post = await getOwnedPost(req, res);
  await post.populate('tags', TAG_FIELDS);
  res.json({ post });
};

// GET /api/posts/:slug   (public)   a single PUBLISHED post. Drafts answer 404, as if they did not exist.
export const getPostBySlug = async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug, status: 'published' })
    .populate('author', 'name bio avatarUrl')
    .populate('tags', TAG_FIELDS);

  if (!post) fail(res, 404, 'Post not found');
  res.json({ post });
};

// POST /api/posts   (protected)   body: { title, content, coverImage, status, tags }
// tags = array of tag names, e.g. ["JavaScript", "mongodb"]; unknown names become new tags.
export const createPost = async (req, res) => {
  // Express 5 leaves req.body undefined when a request has no body / JSON content-type.
  const data = await resolveTagIds(buildPostData(req.body ?? {}, res, true));

  // The author always comes from the verified token, never from the request body.
  // Retry a few times in the rare case two posts grab the same slug at the same moment.
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = await generateUniqueSlug(data.title);
    try {
      const post = await Post.create({ ...data, slug, author: req.user._id });
      await post.populate('tags', TAG_FIELDS);
      return res.status(201).json({ post });
    } catch (error) {
      if (error.code !== 11000) throw error; // 11000 = duplicate key; anything else is a real error
    }
  }
  fail(res, 409, 'Could not generate a unique URL for this post, please try again');
};

// PUT /api/posts/:id   (protected, owner)   body: any of { title, content, coverImage, status, tags }
// The slug is deliberately NOT changed when the title changes, so existing links keep working.
export const updatePost = async (req, res) => {
  const post = await getOwnedPost(req, res);
  const data = await resolveTagIds(buildPostData(req.body ?? {}, res, false));

  post.set(data);
  await post.save(); // runs the schema validators and refreshes updatedAt
  await post.populate('tags', TAG_FIELDS);

  res.json({ post });
};

// DELETE /api/posts/:id   (protected, owner)
export const deletePost = async (req, res) => {
  const post = await getOwnedPost(req, res);
  await post.deleteOne();
  res.json({ message: 'Post deleted', id: post._id });
};
