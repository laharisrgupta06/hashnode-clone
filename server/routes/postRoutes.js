import express from 'express';
import {
  getPosts,
  getMyPosts,
  getPostById,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
} from '../controllers/postController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getPosts);
router.post('/', protect, createPost);

// ORDER MATTERS: Express checks routes top to bottom. "/mine" and "/id/:id" must come
// BEFORE "/:slug", otherwise "/mine" would be treated as a post whose slug is "mine".
router.get('/mine', protect, getMyPosts);
router.get('/id/:id', protect, getPostById);

router.get('/:slug', getPostBySlug);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);

export default router;
