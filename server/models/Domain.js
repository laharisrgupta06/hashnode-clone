import mongoose from 'mongoose';

// A custom domain a publication owner wants to use (e.g. blog.example.com).
// It only counts as connected after a real DNS check finds the verification TXT record
// (see domainController.verifyDomain). Nothing here is ever set to "verified" by hand.
const domainSchema = new mongoose.Schema(
  {
    publication: { type: mongoose.Schema.Types.ObjectId, ref: 'Publication', required: true, index: true },
    hostname: { type: String, required: true, unique: true, lowercase: true, trim: true },
    verificationToken: { type: String, required: true },
    status: { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending' },
    isPrimary: { type: Boolean, default: false },
    lastCheckedAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    lastError: { type: String, default: '' },
  },
  { timestamps: true }
);

const Domain = mongoose.model('Domain', domainSchema);

export default Domain;
