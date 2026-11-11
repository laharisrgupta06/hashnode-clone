import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import toUserResponse from '../utils/toUserResponse.js';
import { MAX_NAME_LENGTH, nameLength } from '../utils/userLimits.js';

// POST /api/auth/register   (public)   body: { name, email, password }
export const register = async (req, res) => {
  // `?? {}`: Express 5 leaves req.body undefined when a request has no body / JSON content-type.
  const { name, email, password } = req.body ?? {};

  // typeof checks stop objects like { "$gt": "" } being passed as an email (NoSQL injection).
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    res.status(400);
    throw new Error('Name, email and password are required');
  }
  if (!name.trim() || !email.trim() || !password) {
    res.status(400);
    throw new Error('Name, email and password are required');
  }
  if (nameLength(name.trim()) > MAX_NAME_LENGTH) {
    res.status(400);
    throw new Error(`Name must be at most ${MAX_NAME_LENGTH} characters`);
  }
  if (password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters');
  }

  const cleanEmail = email.trim().toLowerCase();

  if (await User.findOne({ email: cleanEmail })) {
    res.status(409);
    throw new Error('An account with this email already exists');
  }

  // Hash the password: 10 = how much work bcrypt does (higher = slower and safer).
  const hashedPassword = await bcrypt.hash(password, 10);

  let user;
  try {
    user = await User.create({ name: name.trim(), email: cleanEmail, password: hashedPassword });
  } catch (error) {
    // 11000 = MongoDB's "duplicate key" error, e.g. two people registering the same email at once.
    if (error.code === 11000) {
      res.status(409);
      throw new Error('An account with this email already exists');
    }
    throw error;
  }

  res.status(201).json({ token: generateToken(user._id), user: toUserResponse(user) });
};

// POST /api/auth/login   (public)   body: { email, password }
export const login = async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  // The password hash is hidden by default, so we ask for it explicitly. Only here.
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');

  // Same message for "no such email" and "wrong password", so attackers cannot
  // use the response to find out which emails are registered.
  const passwordMatches = user && (await bcrypt.compare(password, user.password));
  if (!passwordMatches) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  res.json({ token: generateToken(user._id), user: toUserResponse(user) });
};

// GET /api/auth/me   (protected)   returns the logged-in user
export const getMe = async (req, res) => {
  res.json({ user: toUserResponse(req.user) });
};
