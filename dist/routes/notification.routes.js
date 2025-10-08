import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
const router = Router();
// Apply authentication middleware to all routes
router.use(authenticateToken);
// Device token management
router.post('/register-token', (req, res) => notificationController.registerPushToken(req, res));
router.put('/settings', (req, res) => notificationController.updateNotificationSettings(req, res));
// Medication reminder responses
router.post('/confirm-medication', (req, res) => notificationController.confirmMedicationTaken(req, res));
router.post('/snooze-reminder', (req, res) => notificationController.snoozeMedicationReminder(req, res));
// Testing endpoints
router.post('/test', (req, res) => notificationController.sendTestNotification(req, res));
router.post('/create-test-reminder', (req, res) => notificationController.createTestReminder(req, res));
// History
router.get('/history', (req, res) => notificationController.getNotificationHistory(req, res));
export default router;
