import { Router } from 'express';
import patientController from '../controllers/patient.controller.js';
import { authenticateToken, requireUserType } from '../middleware/auth.middleware.js';
const router = Router();
// Apply authentication and patient-only access to all routes
router.use(authenticateToken);
router.use(requireUserType(['patient']));
// Dashboard endpoints
router.get('/dashboard', (req, res) => patientController.getDashboardData(req, res));
// Medication endpoints
router.get('/medications', (req, res) => patientController.getPatientMedications(req, res));
router.get('/medications/by-date', (req, res) => patientController.getMedicationsByDate(req, res));
router.get('/medications/overdue', (req, res) => patientController.getOverdueMedications(req, res));
router.get('/medications/next', (req, res) => patientController.getNextMedications(req, res));
router.post('/medications/mark-taken', (req, res) => patientController.markMedicationTaken(req, res));
// Message endpoints
router.get('/messages', (req, res) => patientController.getPatientMessages(req, res));
router.get('/messages/tutors', (req, res) => patientController.getTutorMessages(req, res));
router.post('/messages/mark-read', (req, res) => patientController.markMessageRead(req, res));
// Profile endpoints
router.get('/profile', (req, res) => patientController.getPatientProfile(req, res));
router.put('/profile', (req, res) => patientController.updatePatientProfile(req, res));
export default router;
