import 'dotenv/config'; // must be first: loads server/.env into process.env
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import tagRoutes from './routes/tagRoutes.js';
import userRoutes from './routes/userRoutes.js';
import publicationRoutes from './routes/publicationRoutes.js';
import { isMailConfigured } from './utils/mailer.js';

// Refuse to start without the JWT settings: running without them would be insecure or broken.
for (const name of ['JWT_SECRET', 'JWT_EXPIRES_IN']) {
  if (!process.env[name]) {
    console.error(`${name} is missing. Add it to server/.env (see .env.example).`);
    process.exit(1);
  }
}

const app = express();

// --- Middleware (runs on every request, in this order) ---
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' })); // let the React app call us
app.use(express.json()); // parse JSON request bodies into req.body

// --- Routes ---
// Health check: lets you (and later the deployment platform) see if the API is alive.
app.get('/api/health', (req, res) => {
  const dbStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: 'ok',
    database: dbStates[mongoose.connection.readyState],
    uptimeSeconds: Math.round(process.uptime()),
  });
});

app.use('/api/auth', authRoutes); // /api/auth/register, /login, /me
app.use('/api/posts', postRoutes); // /api/posts ...
app.use('/api/tags', tagRoutes); // /api/tags, /api/tags/:slug/posts
app.use('/api/users', userRoutes); // /api/users/:id, /api/users/me
app.use('/api/publications', publicationRoutes); // publications, their public websites, domains

// --- Error handling (must come AFTER all routes) ---
app.use(notFound);
app.use(errorHandler);

// --- Start: connect to the database first, then listen for requests ---
const PORT = process.env.PORT || 5001;

await connectDB();
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`);
  // Say plainly whether password-reset email can be sent (no credentials are printed).
  if (isMailConfigured()) console.log(`Email: SMTP configured (${process.env.SMTP_HOST})`);
  else if (process.env.NODE_ENV === 'production') console.warn('Email: SMTP is NOT configured. Password reset requests will be refused until SMTP_* variables are set.');
  else console.log('Email: SMTP not configured. Development mode: password reset links are printed here instead of emailed.');
});
