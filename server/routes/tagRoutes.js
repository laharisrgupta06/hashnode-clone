import express from 'express';
import { getTags, getPostsByTag } from '../controllers/tagController.js';

const router = express.Router();

// Tags are created through posts (POST/PUT /api/posts), so there are only read routes here.
router.get('/', getTags);
router.get('/:slug/posts', getPostsByTag);

export default router;
