import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Universal profile endpoints for all user types
router.get('/profile', (req, res) => userController.getUserProfile(req as any, res));
router.put('/profile', (req, res) => userController.updateUserProfile(req as any, res));

export default router;
