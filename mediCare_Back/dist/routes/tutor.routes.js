import { Router } from 'express';
import tutorController from '../controllers/tutor.controller.js';
import { authenticateToken, requireUserType } from '../middleware/auth.middleware.js';
const router = Router();
// Apply authentication and allow both tutor and doctor access
router.use(authenticateToken);
router.use(requireUserType(['tuteur', 'medecin']));
// Get 3 patients with the nearest medication times
router.get('/patients/nearest-medications', (req, res) => tutorController.getPatientsWithNearestMedications(req, res));
// Get medication alerts (missed medications and message count)
router.get('/alerts/medications', (req, res) => tutorController.getMedicationAlerts(req, res));
// Get combined dashboard data
router.get('/dashboard', (req, res) => tutorController.getDashboardData(req, res));
// Send SMS invitation to new patient
router.post('/patients/invite', (req, res) => tutorController.sendPatientInvitation(req, res));
// Upload voice message (base64)
router.post('/voice-messages/upload', (req, res) => tutorController.uploadVoiceMessage(req, res));
// Get all patients for the tutor
router.get('/patients', (req, res) => tutorController.getAllPatients(req, res));
// Delete patient relationship
router.delete('/patients/:patientId', (req, res) => tutorController.deletePatient(req, res));
// Manual confirmation of a medication reminder
router.post('/confirm-medication', (req, res) => tutorController.confirmMedicationManually(req, res));
// Search patients
router.get('/patients/search', (req, res) => tutorController.searchPatients(req, res));
// Get a patient's profile
router.get('/patients/:patientId/profile', (req, res) => tutorController.getPatientProfile(req, res));
// Create a prescription for a patient (tutor acting similar to doctor)
router.post('/patients/:patientId/prescriptions', (req, res) => {
    // Ensure body has patientId for service; merge from params if missing
    if (!req.body)
        req.body = {};
    req.body.patientId = req.params.patientId;
    return tutorController.createPrescription(req, res);
});
// Update a prescription
router.put('/prescriptions/:prescriptionId', (req, res) => tutorController.updatePrescription(req, res));
// Delete a prescription
router.delete('/prescriptions/:prescriptionId', (req, res) => tutorController.deletePrescription(req, res));
// Voice messages: list and create
router.get('/voice-messages', (req, res) => tutorController.getVoiceMessages(req, res));
router.post('/voice-messages', (req, res) => tutorController.createVoiceMessage(req, res));
router.delete('/voice-messages/:id', (req, res) => tutorController.deleteVoiceMessage(req, res));
// Reminder generation endpoints
router.post('/reminders/generate-today', (req, res) => tutorController.generateTodaysReminders(req, res));
router.post('/reminders/generate-next-days', (req, res) => tutorController.generateRemindersForNextDays(req, res));
export default router;
