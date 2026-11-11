import express from 'express';
import { getUserProfile, updateMe } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.put('/me', protect, updateMe);
router.get('/:id', getUserProfile);

export default router;
