import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Device token management
router.post('/register-token', (req, res) => notificationController.registerPushToken(req as any, res));
router.put('/settings', (req, res) => notificationController.updateNotificationSettings(req as any, res));

// Medication reminder responses
router.post('/confirm-medication', (req, res) => notificationController.confirmMedicationTaken(req as any, res));
router.post('/snooze-reminder', (req, res) => notificationController.snoozeMedicationReminder(req as any, res));

// Testing endpoints
router.post('/test', (req, res) => notificationController.sendTestNotification(req as any, res));
router.post('/create-test-reminder', (req, res) => notificationController.createTestReminder(req as any, res));

// History
router.get('/history', (req, res) => notificationController.getNotificationHistory(req as any, res));

export default router;
