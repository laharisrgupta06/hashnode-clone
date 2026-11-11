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
    // One post -> one author. ref: 'User' lets us later call .populate('author').
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // One post -> many tags (an array of Tag ids).
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  },
  { timestamps: true }
);

const Post = mongoose.model('Post', postSchema);

export default Post;
