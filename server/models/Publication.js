import mongoose from 'mongoose';
import { ACCENT_COLORS, FONT_PRESETS, LAYOUTS, DEFAULT_APPEARANCE } from '../utils/publicationRules.js';

// A Publication = a blog with its own identity, address and website. Articles (Posts) belong to one.
const publicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Part of the public address: /p/<slug> (and later <slug>.<platform domain>). Never changes after creation.
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    tagline: { type: String, default: '' },
    description: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Reserved for contributors later; today only the owner can manage a publication.
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['editor', 'writer'], default: 'writer' },
      },
    ],
    appearance: {
      accentColor: { type: String, enum: ACCENT_COLORS, default: DEFAULT_APPEARANCE.accentColor },
      fontPreset: { type: String, enum: FONT_PRESETS, default: DEFAULT_APPEARANCE.fontPreset },
      layout: { type: String, enum: LAYOUTS, default: DEFAULT_APPEARANCE.layout },
    },
  },
  { timestamps: true }
);

const Publication = mongoose.model('Publication', publicationSchema);

export default Publication;
