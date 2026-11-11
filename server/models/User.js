import mongoose from 'mongoose';

// A User document = one registered account.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // unique: true makes MongoDB reject a second account with the same email.
    // lowercase: true stores "Me@Mail.com" as "me@mail.com".
    email: { type: String, required: true, unique: true, lowercase: true },
    // Holds the bcrypt HASH, never the plain password.
    // select: false = normal queries (find, findById, populate...) leave this field out.
    // Only login asks for it explicitly with .select('+password').
    password: { type: String, required: true, select: false },
    bio: { type: String, maxlength: 200, default: '' },
    avatarUrl: { type: String, default: '' },
  },
  // timestamps: true adds createdAt and updatedAt automatically.
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;
