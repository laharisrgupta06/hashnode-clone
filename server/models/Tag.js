import mongoose from 'mongoose';

// A Tag document = one topic such as "javascript" or "mongodb".
const tagSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, lowercase: true, trim: true },
    slug: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const Tag = mongoose.model('Tag', tagSchema);

export default Tag;
