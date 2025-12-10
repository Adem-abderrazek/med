import { Router } from 'express';
import doctorController from '../controllers/doctor.controller.js';
import { AuthenticatedRequest, authenticateToken, requireUserType } from '../middleware/auth.middleware.js';

const router = Router();

// Apply authentication - allow both doctors and tutors to access these routes
router.use(authenticateToken);
router.use(requireUserType(['medecin', 'tuteur']));

// Dashboard endpoints
router.get('/dashboard', (req, res) => doctorController.getDashboardData(req as AuthenticatedRequest, res));

// Patient management endpoints
router.get('/patients', (req, res) => doctorController.getAllPatients(req as AuthenticatedRequest, res));
router.get('/patients/search', (req, res) => doctorController.searchPatients(req as AuthenticatedRequest, res));
router.get('/patients/:patientId/profile', (req, res) => doctorController.getPatientProfile(req as AuthenticatedRequest, res));

// Prescription management
router.post('/patients/:patientId/prescriptions', (req, res) => {
  // Ensure body has patientId for service; merge from params if missing
  if (!req.body) (req as any).body = {};
  (req as any).body.patientId = (req.params as any).patientId;
  return doctorController.createPrescription(req as AuthenticatedRequest, res);
});

// Patient medication management
router.get('/patients/:patientId/medications', (req, res) => doctorController.getPatientMedications(req as AuthenticatedRequest, res));
router.post('/patients/:patientId/medications', (req, res) => doctorController.addPatientMedication(req as AuthenticatedRequest, res));

// Delete patient relationship
router.delete('/patients/:patientId', (req, res) => doctorController.deletePatient(req as AuthenticatedRequest, res));

export default router;
