import mongoose from 'mongoose';
import User from '../models/User.js';
import { findPublishedPosts } from './postController.js';
import toUserResponse from '../utils/toUserResponse.js';
import isHttpUrl from '../utils/isHttpUrl.js';
import { MAX_NAME_LENGTH, MAX_BIO_LENGTH, nameLength } from '../utils/userLimits.js';

// Set the HTTP status, then throw. errorMiddleware turns it into JSON.
const fail = (res, status, message) => {
  res.status(status);
  throw new Error(message);
};

// GET /api/users/:id   (public)
// A user's public profile plus their PUBLISHED posts. No email, no password, no drafts.
export const getUserProfile = async (req, res) => {
  // A malformed id and an unknown id get the same 404, so the client needs only one "not found" page.
  if (!mongoose.isValidObjectId(req.params.id)) fail(res, 404, 'User not found');

  // .select() = only these fields are even read from the database.
  const user = await User.findById(req.params.id).select('name bio avatarUrl');
  if (!user) fail(res, 404, 'User not found');

  const posts = await findPublishedPosts({ author: user._id });

  res.json({
    user: { _id: user._id, name: user.name, bio: user.bio, avatarUrl: user.avatarUrl },
    posts,
  });
};

// PUT /api/users/me   (protected)   body: any of { name, bio, avatarUrl }
// There is no :id in this route: the user to update ALWAYS comes from the verified token (req.user),
// so it is impossible to edit someone else's profile by changing a URL or body field.
export const updateMe = async (req, res) => {
  const body = req.body ?? {}; // Express 5: req.body is undefined if the request had no body
  const data = {}; // only these three fields can ever be changed; email, password etc. are ignored

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) fail(res, 400, 'Name cannot be empty');
    const name = body.name.trim();
    if (nameLength(name) > MAX_NAME_LENGTH) fail(res, 400, `Name must be at most ${MAX_NAME_LENGTH} characters`);
    data.name = name;
  }

  if (body.bio !== undefined) {
    if (typeof body.bio !== 'string') fail(res, 400, 'Bio must be text');
    const bio = body.bio.trim();
    // .length (not code points) on purpose: this is exactly how the schema's maxlength counts,
    // so what passes here can never fail inside Mongoose and turn into a 500.
    if (bio.length > MAX_BIO_LENGTH) fail(res, 400, `Bio must be at most ${MAX_BIO_LENGTH} characters`);
    data.bio = bio;
  }

  if (body.avatarUrl !== undefined) {
    if (typeof body.avatarUrl !== 'string') fail(res, 400, 'Avatar must be a URL string');
    const avatarUrl = body.avatarUrl.trim();
    // Empty = no avatar. Otherwise it must be an http(s) URL (blocks javascript:, data: ...).
    if (avatarUrl && !isHttpUrl(avatarUrl)) fail(res, 400, 'Avatar must be a valid http(s) URL');
    data.avatarUrl = avatarUrl;
  }

  // Nothing to change (empty body): return the current profile unchanged, like PUT /api/posts/:id.
  if (Object.keys(data).length === 0) return res.json({ user: toUserResponse(req.user) });

  // One atomic update that touches only the fields above. The password field is never loaded or written.
  const user = await User.findByIdAndUpdate(req.user._id, { $set: data }, { new: true, runValidators: true });
  if (!user) fail(res, 404, 'User not found'); // account deleted between the token check and now

  res.json({ user: toUserResponse(user) });
};
