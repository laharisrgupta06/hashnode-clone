import mongoose from 'mongoose';

// A Post document = one article. It points to its author and tags by their _id
// (a reference), instead of copying their data into the post.
const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true }, // used in URLs: /post/my-title
    content: { type: String, required: true }, // raw Markdown text
    excerpt: { type: String, maxlength: 250 },
    coverImage: { type: String, default: '' },
    // Only 'published' posts are shown publicly; new posts default to 'draft'.
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    // When the article was (last) published. Set ONLY by the server (postController): now on
    // publishing a draft, kept while it stays published, cleared (null) when it goes back to draft.
    // Articles published before this field existed have none; public lists then fall back to createdAt.
    publishedAt: { type: Date, default: null },
    // One post -> one author. ref: 'User' lets us later call .populate('author').
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // One post -> many tags (an array of Tag ids).
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
    // The publication this article belongs to. Set once at creation (owner-checked) and never moved.
    publication: { type: mongoose.Schema.Types.ObjectId, ref: 'Publication', required: true, index: true },
  },
  { timestamps: true }
);

const Post = mongoose.model('Post', postSchema);

export default Post;
