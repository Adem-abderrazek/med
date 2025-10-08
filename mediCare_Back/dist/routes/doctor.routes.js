import { Router } from 'express';
import doctorController from '../controllers/doctor.controller.js';
import { authenticateToken, requireUserType } from '../middleware/auth.middleware.js';
const router = Router();
// Apply authentication - allow both doctors and tutors to access these routes
router.use(authenticateToken);
router.use(requireUserType(['medecin', 'tuteur']));
// Dashboard endpoints
router.get('/dashboard', (req, res) => doctorController.getDashboardData(req, res));
// Patient management endpoints
router.get('/patients', (req, res) => doctorController.getAllPatients(req, res));
router.get('/patients/search', (req, res) => doctorController.searchPatients(req, res));
router.get('/patients/:patientId/profile', (req, res) => doctorController.getPatientProfile(req, res));
// Prescription management
router.post('/patients/:patientId/prescriptions', (req, res) => {
    // Ensure body has patientId for service; merge from params if missing
    if (!req.body)
        req.body = {};
    req.body.patientId = req.params.patientId;
    return doctorController.createPrescription(req, res);
});
// Patient medication management
router.get('/patients/:patientId/medications', (req, res) => doctorController.getPatientMedications(req, res));
router.post('/patients/:patientId/medications', (req, res) => doctorController.addPatientMedication(req, res));
// Delete patient relationship
router.delete('/patients/:patientId', (req, res) => doctorController.deletePatient(req, res));
export default router;
