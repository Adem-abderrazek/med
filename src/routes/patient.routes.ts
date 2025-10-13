import { Router } from 'express';
import patientController from '../controllers/patient.controller.js';
import { AuthenticatedRequest, authenticateToken, requireUserType } from '../middleware/auth.middleware.js';

const router = Router();

// Apply authentication and patient-only access to all routes
router.use(authenticateToken);
router.use(requireUserType(['patient']));

// Dashboard endpoints
router.get('/dashboard', (req, res) => patientController.getDashboardData(req as AuthenticatedRequest, res));

// Medication endpoints
router.get('/medications', (req, res) => patientController.getPatientMedications(req as AuthenticatedRequest, res));
router.get('/medications/by-date', (req, res) => patientController.getMedicationsByDate(req as AuthenticatedRequest, res));
router.get('/medications/overdue', (req, res) => patientController.getOverdueMedications(req as AuthenticatedRequest, res));
router.get('/medications/next', (req, res) => patientController.getNextMedications(req as AuthenticatedRequest, res));
router.post('/medications/mark-taken', (req, res) => patientController.markMedicationTaken(req as AuthenticatedRequest, res));

// Offline sync endpoints
router.get('/reminders/upcoming', (req, res) => patientController.getUpcomingReminders(req as AuthenticatedRequest, res));
router.get('/check-updates', (req, res) => patientController.checkForUpdates(req as AuthenticatedRequest, res));

// Message endpoints
router.get('/messages', (req, res) => patientController.getPatientMessages(req as AuthenticatedRequest, res));
router.get('/messages/tutors', (req, res) => patientController.getTutorMessages(req as AuthenticatedRequest, res));
router.post('/messages/mark-read', (req, res) => patientController.markMessageRead(req as AuthenticatedRequest, res));

// Profile endpoints
router.get('/profile', (req, res) => patientController.getPatientProfile(req as AuthenticatedRequest, res));
router.put('/profile', (req, res) => patientController.updatePatientProfile(req as AuthenticatedRequest, res));

export default router;
