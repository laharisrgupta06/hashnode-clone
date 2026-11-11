import 'dotenv/config'; // must be first: loads server/.env into process.env
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

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

// --- Error handling (must come AFTER all routes) ---
app.use(notFound);
app.use(errorHandler);

// --- Start: connect to the database first, then listen for requests ---
const PORT = process.env.PORT || 5001;

await connectDB();
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`);
});
