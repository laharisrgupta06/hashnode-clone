import mongoose from 'mongoose';

// A User document = one registered account.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // unique: true makes MongoDB reject a second account with the same email.
    // lowercase: true stores "Me@Mail.com" as "me@mail.com".
    email: { type: String, required: true, unique: true, lowercase: true },
    // This will hold the bcrypt HASH, never the plain password (done in Layer 1.3).
    password: { type: String, required: true },
    bio: { type: String, maxlength: 200, default: '' },
    avatarUrl: { type: String, default: '' },
  },
  // timestamps: true adds createdAt and updatedAt automatically.
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;
