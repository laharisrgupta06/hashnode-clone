import Post from '../models/Post.js';
import Tag from '../models/Tag.js';
import { findPublishedPosts } from './postController.js';

// GET /api/tags   (public)
// Every tag that has at least one PUBLISHED post, with how many published posts use it.
// Drafts are not counted, and tags used only by drafts are not listed, so drafts leak nothing.
export const getTags = async (req, res) => {
  // Count, per tag id, the published posts that contain it.
  // $unwind turns one post with 3 tags into 3 rows, so the rows can be grouped per tag.
  const counts = await Post.aggregate([
    { $match: { status: 'published' } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', postCount: { $sum: 1 } } },
  ]);

  const tags = await Tag.find({ _id: { $in: counts.map((c) => c._id) } }).select('name slug');
  const countById = new Map(counts.map((c) => [c._id.toString(), c.postCount]));

  const result = tags
    .map((tag) => ({
      _id: tag._id,
      name: tag.name,
      slug: tag.slug,
      postCount: countById.get(tag._id.toString()),
    }))
    // most used first, then alphabetical
    .sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name));

  res.json({ tags: result });
};

// GET /api/tags/:slug/posts   (public)   published posts under one tag, newest first
// A tag with no PUBLISHED posts answers 404 exactly like a tag that does not exist,
// so nobody can tell that a draft-only tag exists.
export const getPostsByTag = async (req, res) => {
  const tag = await Tag.findOne({ slug: req.params.slug }).select('name slug');
  const posts = tag ? await findPublishedPosts({ tags: tag._id }) : [];

  if (!tag || posts.length === 0) {
    res.status(404);
    throw new Error('Tag not found');
  }

  res.json({ tag, posts });
};
