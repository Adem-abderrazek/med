import { Router } from 'express';
import tutorController from '../controllers/tutor.controller.js';
import { AuthenticatedRequest, authenticateToken, requireUserType } from '../middleware/auth.middleware.js';

const router = Router();

// Apply authentication and allow both tutor and doctor access
router.use(authenticateToken);
router.use(requireUserType(['tuteur', 'medecin']));

// Get 3 patients with the nearest medication times
router.get('/patients/nearest-medications', (req, res) => tutorController.getPatientsWithNearestMedications(req as AuthenticatedRequest, res));

// Get medication alerts (missed medications and message count)
router.get('/alerts/medications', (req, res) => tutorController.getMedicationAlerts(req as AuthenticatedRequest, res));

// Get combined dashboard data
router.get('/dashboard', (req, res) => tutorController.getDashboardData(req as AuthenticatedRequest, res));

// Send SMS invitation to new patient
router.post('/patients/invite', (req, res) => tutorController.sendPatientInvitation(req as AuthenticatedRequest, res));

// Upload voice message (base64)
router.post('/voice-messages/upload', (req, res) => tutorController.uploadVoiceMessage(req as AuthenticatedRequest, res));

// Get all patients for the tutor
router.get('/patients', (req, res) => tutorController.getAllPatients(req as AuthenticatedRequest, res));

// Delete patient relationship
router.delete('/patients/:patientId', (req, res) => tutorController.deletePatient(req as AuthenticatedRequest, res));

// Manual confirmation of a medication reminder
router.post('/confirm-medication', (req, res) => tutorController.confirmMedicationManually(req as AuthenticatedRequest, res));

// Search patients
router.get('/patients/search', (req, res) => tutorController.searchPatients(req as AuthenticatedRequest, res));

// Get a patient's profile
router.get('/patients/:patientId/profile', (req, res) => tutorController.getPatientProfile(req as AuthenticatedRequest, res));

// Get a patient's adherence history
router.get('/patients/:patientId/adherence-history', (req, res) => tutorController.getPatientAdherenceHistory(req as AuthenticatedRequest, res));

// Create a prescription for a patient (tutor acting similar to doctor)
router.post('/patients/:patientId/prescriptions', (req, res) => {
  // Ensure body has patientId for service; merge from params if missing
  if (!req.body) (req as any).body = {};
  (req as any).body.patientId = (req.params as any).patientId;
  return tutorController.createPrescription(req as AuthenticatedRequest, res);
});

// Update a prescription
router.put('/prescriptions/:prescriptionId', (req, res) => tutorController.updatePrescription(req as AuthenticatedRequest, res));

// Delete a prescription
router.delete('/prescriptions/:prescriptionId', (req, res) => tutorController.deletePrescription(req as AuthenticatedRequest, res));

// Voice messages: list and create
router.get('/voice-messages', (req, res) => tutorController.getVoiceMessages(req as AuthenticatedRequest, res));
router.post('/voice-messages', (req, res) => tutorController.createVoiceMessage(req as AuthenticatedRequest, res));
router.delete('/voice-messages/:id', (req, res) => tutorController.deleteVoiceMessage(req as AuthenticatedRequest, res));

// Reminder generation endpoints
router.post('/reminders/generate-today', (req, res) => tutorController.generateTodaysReminders(req as AuthenticatedRequest, res));
router.post('/reminders/generate-next-days', (req, res) => tutorController.generateRemindersForNextDays(req as AuthenticatedRequest, res));

// Repair utility - link existing reminders to voice messages
router.post('/reminders/link-voice-messages', (req, res) => tutorController.linkRemindersToVoiceMessages(req as AuthenticatedRequest, res));

export default router;
