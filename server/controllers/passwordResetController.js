import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { isMailConfigured, sendMail } from '../utils/mailer.js';

// Forgotten-password flow.
//
// 1. POST /api/auth/forgot-password { email }
//    Always the same answer, whether or not the email is registered. If it is, a random token is
//    created, only its SHA-256 hash is stored with a 30-minute expiry, and the link is emailed
//    (in the background, after answering, so response time does not reveal anything either).
// 2. POST /api/auth/reset-password { token, password }
//    The token is hashed and looked up; if it matches and has not expired, the password is
//    replaced and the token is deleted (single use).

const TOKEN_LIFETIME_MS = 30 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000; // one email per account per minute
const MIN_PASSWORD_LENGTH = 6; // the same rule as registration
const GENERIC_MESSAGE = 'If an account exists for that email, a link to reset the password has been sent. It expires in 30 minutes.';

const isProduction = () => process.env.NODE_ENV === 'production';
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// The link points at the React app. The token travels in the URL fragment (#...), which browsers
// never send to any server, so it cannot end up in web-server or proxy logs.
const resetLink = (token) => `${(process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '')}/reset-password#token=${token}`;

function emailContent(name, link) {
  const text = [
    `Hi ${name},`,
    '',
    'Someone asked to reset the password of your DevPress account. If it was you, open this link within 30 minutes:',
    '',
    link,
    '',
    'If you did not ask for this, ignore this email: your password stays the same.',
  ].join('\n');
  const html = `<p>Hi ${escapeHtml(name)},</p>
<p>Someone asked to reset the password of your DevPress account. If it was you, open this link within 30 minutes:</p>
<p><a href="${link}">Reset your password</a></p>
<p>If you did not ask for this, ignore this email: your password stays the same.</p>`;
  return { text, html };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// POST /api/auth/forgot-password   (public)   body: { email }
export const forgotPassword = async (req, res) => {
  const { email } = req.body ?? {};
  if (typeof email !== 'string' || !email.trim()) {
    res.status(400);
    throw new Error('Enter the email address of your account');
  }

  const mailReady = isMailConfigured();
  // Production without email: say so plainly, for every request (it reveals nothing about accounts).
  if (!mailReady && isProduction()) {
    res.status(503);
    throw new Error('Password reset by email is not available right now. Please contact the site owner.');
  }

  // Development without SMTP: the link goes to the server terminal instead (never in production).
  const delivery = mailReady ? 'email' : 'console';
  res.json({ message: GENERIC_MESSAGE, delivery });

  // ----- after answering: create and send the token, if the account exists -----
  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+resetPasswordRequestedAt');
    if (!user) return;
    if (user.resetPasswordRequestedAt && Date.now() - user.resetPasswordRequestedAt.getTime() < RESEND_COOLDOWN_MS) return;

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordTokenHash = hashToken(token); // replaces any earlier token: only the newest link works
    user.resetPasswordExpires = new Date(Date.now() + TOKEN_LIFETIME_MS);
    user.resetPasswordRequestedAt = new Date();
    await user.save();

    const link = resetLink(token);
    if (mailReady) {
      const { text, html } = emailContent(user.name, link);
      await sendMail({ to: user.email, subject: 'Reset your DevPress password', text, html });
    } else {
      console.log(`\n[development only] SMTP is not configured, so the password reset email was not sent.\n[development only] Reset link for ${user.email} (valid 30 minutes):\n${link}\n`);
    }
  } catch (error) {
    // Logged for the operator without the token or the link.
    console.error(`Password reset email could not be sent: ${error.message}`);
  }
};

// POST /api/auth/reset-password   (public)   body: { token, password }
export const resetPassword = async (req, res) => {
  const { token, password } = req.body ?? {};
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    res.status(400);
    throw new Error('This reset link is invalid or has expired. Ask for a new one.');
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    res.status(400);
    throw new Error(`The password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const user = await User.findOne({ resetPasswordTokenHash: hashToken(token), resetPasswordExpires: { $gt: new Date() } }).select('+password +resetPasswordTokenHash +resetPasswordExpires');
  if (!user) {
    res.status(400);
    throw new Error('This reset link is invalid or has expired. Ask for a new one.');
  }

  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordTokenHash = undefined; // single use
  user.resetPasswordExpires = undefined;
  await user.save();
  res.json({ message: 'Your password has been changed. You can log in with the new password.' });
};
