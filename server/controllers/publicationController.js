import mongoose from 'mongoose';
import Publication from '../models/Publication.js';
import Post from '../models/Post.js';
import Tag from '../models/Tag.js';
import '../models/User.js';
import isHttpUrl from '../utils/isHttpUrl.js';
import { findPublishedPosts } from './postController.js';
import {
  NAME_MAX, TAGLINE_MAX, DESCRIPTION_MAX, ACCENT_COLORS, FONT_PRESETS, LAYOUTS, checkSlug,
} from '../utils/publicationRules.js';

const fail = (res, status, message) => {
  res.status(status);
  throw new Error(message);
};

const OWNER_FIELDS = 'name avatarUrl bio';
// What anyone may see about a publication. Members and internal ids of other users are left out.
const PUBLIC_FIELDS = 'name slug tagline description logoUrl coverImage appearance owner createdAt updatedAt';

// Counts published and draft articles per publication id, in one query.
async function countPosts(publicationIds) {
  const rows = await Post.aggregate([
    { $match: { publication: { $in: publicationIds } } },
    { $group: { _id: { publication: '$publication', status: '$status' }, n: { $sum: 1 } } },
  ]);
  const counts = new Map(publicationIds.map((id) => [id.toString(), { published: 0, draft: 0 }]));
  for (const row of rows) counts.get(row._id.publication.toString())[row._id.status] = row.n;
  return counts;
}

const toPublic = (pub, counts) => ({
  _id: pub._id,
  name: pub.name,
  slug: pub.slug,
  tagline: pub.tagline,
  description: pub.description,
  logoUrl: pub.logoUrl,
  coverImage: pub.coverImage,
  appearance: pub.appearance,
  owner: pub.owner,
  createdAt: pub.createdAt,
  updatedAt: pub.updatedAt,
  publishedCount: counts?.published ?? 0,
});

// Validates the editable fields. isCreate: name and slug are required.
// Returns only allowed fields, so owner, members, _id... can never be set by a client.
function buildPublicationData(body, res, isCreate) {
  const data = {};

  if (isCreate || body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) fail(res, 400, 'Give your publication a name');
    if ([...body.name.trim()].length > NAME_MAX) fail(res, 400, `The name can have at most ${NAME_MAX} characters`);
    data.name = body.name.trim();
  }

  if (isCreate) {
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : body.slug;
    const problem = checkSlug(slug);
    if (problem) fail(res, 400, problem);
    data.slug = slug;
  }

  for (const [field, max, label] of [
    ['tagline', TAGLINE_MAX, 'The tagline'],
    ['description', DESCRIPTION_MAX, 'The description'],
  ]) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'string') fail(res, 400, `${label} must be text`);
      const value = body[field].trim();
      if (value.length > max) fail(res, 400, `${label} can have at most ${max} characters`);
      data[field] = value;
    }
  }

  for (const [field, label] of [
    ['logoUrl', 'Logo'],
    ['coverImage', 'Cover image'],
  ]) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'string') fail(res, 400, `${label} must be a URL string`);
      const url = body[field].trim();
      if (url && !isHttpUrl(url)) fail(res, 400, `${label} must be a valid http(s) URL`);
      data[field] = url;
    }
  }

  if (body.appearance !== undefined) {
    const a = body.appearance;
    if (!a || typeof a !== 'object' || Array.isArray(a)) fail(res, 400, 'Appearance must be an object');
    if (a.accentColor !== undefined) {
      if (!ACCENT_COLORS.includes(a.accentColor)) fail(res, 400, 'Choose one of the available accent colours');
      data['appearance.accentColor'] = a.accentColor;
    }
    if (a.fontPreset !== undefined) {
      if (!FONT_PRESETS.includes(a.fontPreset)) fail(res, 400, 'Choose one of the available typography presets');
      data['appearance.fontPreset'] = a.fontPreset;
    }
    if (a.layout !== undefined) {
      if (!LAYOUTS.includes(a.layout)) fail(res, 400, 'Choose one of the available layouts');
      data['appearance.layout'] = a.layout;
    }
  }

  return data;
}

// Loads a publication by slug and checks the logged-in user owns it. 404 unknown, 403 not yours.
export async function getOwnedPublication(req, res) {
  const slug = String(req.params.slug ?? '').toLowerCase();
  const pub = await Publication.findOne({ slug });
  if (!pub) fail(res, 404, 'Publication not found');
  if (pub.owner.toString() !== req.user._id.toString()) fail(res, 403, 'Not authorized: this is not your publication');
  return pub;
}

// GET /api/publications   (public)   newest first, for the landing page and Explore
export const listPublications = async (req, res) => {
  const pubs = await Publication.find().select(PUBLIC_FIELDS).populate('owner', OWNER_FIELDS).sort({ createdAt: -1 }).limit(60);
  const counts = await countPosts(pubs.map((p) => p._id));
  res.json({ publications: pubs.map((p) => toPublic(p, counts.get(p._id.toString()))) });
};

// GET /api/publications/check-slug?slug=...   (public)
export const checkSlugAvailability = async (req, res) => {
  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim().toLowerCase() : '';
  const problem = checkSlug(slug);
  if (problem) return res.json({ slug, available: false, reason: problem });
  const taken = await Publication.exists({ slug });
  res.json({ slug, available: !taken, reason: taken ? 'That address is already taken' : null });
};

// GET /api/publications/mine   (protected)   the logged-in user's publications with article counts
export const getMyPublications = async (req, res) => {
  const pubs = await Publication.find({ owner: req.user._id }).sort({ createdAt: 1 });
  const counts = await countPosts(pubs.map((p) => p._id));
  res.json({
    publications: pubs.map((p) => ({ ...toPublic(p, counts.get(p._id.toString())), draftCount: counts.get(p._id.toString()).draft })),
  });
};

// POST /api/publications   (protected)
export const createPublication = async (req, res) => {
  const data = buildPublicationData(req.body ?? {}, res, true);
  if (await Publication.exists({ slug: data.slug })) fail(res, 409, 'That address is already taken');
  const appearance = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('appearance.')) {
      appearance[key.slice('appearance.'.length)] = value;
      delete data[key];
    }
  }
  try {
    const pub = await Publication.create({ ...data, appearance, owner: req.user._id });
    res.status(201).json({ publication: { ...toPublic(pub), draftCount: 0 } });
  } catch (error) {
    if (error.code === 11000) fail(res, 409, 'That address is already taken'); // two requests at once
    throw error;
  }
};

// GET /api/publications/:slug   (public)   a publication's public identity
export const getPublication = async (req, res) => {
  const pub = await Publication.findOne({ slug: String(req.params.slug).toLowerCase() }).select(PUBLIC_FIELDS).populate('owner', OWNER_FIELDS);
  if (!pub) fail(res, 404, 'Publication not found');
  const counts = await countPosts([pub._id]);
  // Tags used by this publication's PUBLISHED articles, for its website's tag navigation.
  const tagIds = await Post.distinct('tags', { publication: pub._id, status: 'published' });
  const tags = await Tag.find({ _id: { $in: tagIds } }).select('name slug').sort({ name: 1 });
  res.json({ publication: toPublic(pub, counts.get(pub._id.toString())), tags });
};

// GET /api/publications/:slug/posts?tag=&search=   (public)   published articles of ONE publication
export const getPublicationPosts = async (req, res) => {
  const pub = await Publication.findOne({ slug: String(req.params.slug).toLowerCase() }).select('_id');
  if (!pub) fail(res, 404, 'Publication not found');
  const filter = { publication: pub._id };
  if (typeof req.query.tag === 'string' && req.query.tag.trim()) {
    const tag = await Tag.findOne({ slug: req.query.tag.trim().toLowerCase() });
    if (!tag) return res.json({ posts: [] });
    filter.tags = tag._id;
  }
  if (typeof req.query.search === 'string' && req.query.search.trim()) {
    filter.title = { $regex: req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }
  res.json({ posts: await findPublishedPosts(filter) });
};

// GET /api/publications/:slug/posts/:postSlug   (public)   one PUBLISHED article of THIS publication
export const getPublicationPost = async (req, res) => {
  const pub = await Publication.findOne({ slug: String(req.params.slug).toLowerCase() }).select('_id');
  if (!pub) fail(res, 404, 'Publication not found');
  const post = await Post.findOne({ slug: req.params.postSlug, publication: pub._id, status: 'published' })
    .populate('author', 'name bio avatarUrl')
    .populate('tags', 'name slug')
    .populate('publication', 'name slug logoUrl appearance');
  if (!post) fail(res, 404, 'Post not found');
  res.json({ post });
};

// GET /api/publications/:slug/manage   (owner)   full publication for the workspace, with counts
export const getManagedPublication = async (req, res) => {
  const pub = await getOwnedPublication(req, res);
  const counts = (await countPosts([pub._id])).get(pub._id.toString());
  res.json({ publication: { ...toPublic(pub, counts), draftCount: counts.draft } });
};

// GET /api/publications/:slug/manage/posts   (owner)   every article of this publication, drafts included
export const getManagedPosts = async (req, res) => {
  const pub = await getOwnedPublication(req, res);
  const posts = await Post.find({ publication: pub._id })
    .select('-content')
    .populate('tags', 'name slug')
    .populate('author', 'name avatarUrl')
    .sort({ updatedAt: -1 });
  res.json({ posts });
};

// PUT /api/publications/:slug   (owner)   name, tagline, description, logo, cover, appearance. Slug is fixed.
export const updatePublication = async (req, res) => {
  const pub = await getOwnedPublication(req, res);
  const body = req.body ?? {};
  if (body.slug !== undefined && body.slug !== pub.slug) fail(res, 400, "A publication's address cannot be changed after it is created");
  const data = buildPublicationData(body, res, false);
  const updated = await Publication.findByIdAndUpdate(pub._id, { $set: data }, { new: true, runValidators: true });
  const counts = (await countPosts([pub._id])).get(pub._id.toString());
  res.json({ publication: { ...toPublic(updated, counts), draftCount: counts.draft } });
};

export const isValidId = (id) => mongoose.isValidObjectId(id);
