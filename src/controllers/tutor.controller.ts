import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import tutorService from '../services/tutor.service.js';
import { reminderGeneratorService } from '../services/reminder-generator.service.js';
import firebaseStorageService from '../services/firebaseStorage.service.js';

class TutorController {
  /**
   * Get 3 patients with the nearest medication times for the authenticated tutor
   */
  async getPatientsWithNearestMedications(req: AuthenticatedRequest, res: Response) {
    try {
      const tutorId = req.user.userId;
      
      const patients = await tutorService.getPatientsWithNearestMedications(tutorId);
      
      res.json({
        success: true,
        data: patients,
        message: `Found ${patients.length} patients with upcoming medications`
      });
    } catch (error) {
      console.error('Error in getPatientsWithNearestMedications controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get patients with nearest medications'
      });
    }
  }

  /**
   * Get medication alerts for missed medications and count of messages sent
   */
  async getMedicationAlerts(req: AuthenticatedRequest, res: Response) {
    try {
      const tutorId = req.user.userId;
      
      const alerts = await tutorService.getMedicationAlerts(tutorId);
      
      res.json({
        success: true,
        data: alerts,
        message: `Found ${alerts.missedMedications.length} missed medication alerts, ${alerts.totalMessagesSent} total messages sent, and ${alerts.voiceMessageCount} voice messages`
      });
    } catch (error) {
      console.error('Error in getMedicationAlerts controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get medication alerts'
      });
    }
  }

  /**
   * Get dashboard data for tutor (combines both endpoints)
   */
  async getDashboardData(req: AuthenticatedRequest, res: Response) {
    try {
      const tutorId = req.user.userId;
      
      // Get both patients with nearest medications and alerts
      const [patients, alerts] = await Promise.all([
        tutorService.getPatientsWithNearestMedications(tutorId),
        tutorService.getMedicationAlerts(tutorId)
      ]);
      
      res.json({
        success: true,
        data: {
          patientsWithNearestMedications: patients,
          alerts: alerts
        },
        message: 'Dashboard data retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getDashboardData controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard data'
      });
    }
  }

  /**
   * Send SMS invitation to new patient
   */
  async sendPatientInvitation(req: AuthenticatedRequest, res: Response) {
    try {
      console.log('📱 sendPatientInvitation called by user:', req.user.userId, 'type:', req.user.userType);
      console.log('📱 Request body:', req.body);
      
      const tutorId = req.user.userId;
      const { firstName, lastName, phoneNumber, audioMessage, audioDuration } = req.body;
      
      // Handle different request formats (tutor vs doctor)
      let finalFirstName = firstName;
      let finalLastName = lastName;
      
      // If only phoneNumber is provided (doctor request), use placeholder names
      if (!firstName && !lastName && phoneNumber) {
        finalFirstName = 'Patient';
        finalLastName = 'Inconnu';
        console.log('📱 Doctor request detected, using placeholder names');
      }
      
      // Validate required fields
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      const result = await tutorService.sendPatientInvitation(tutorId, {
        firstName: finalFirstName,
        lastName: finalLastName,
        phoneNumber,
        audioMessage,
        audioDuration
      });
      
      console.log('📱 Patient invitation result:', result);
      
      res.json({
        success: true,
        data: result,
        message: 'Patient invitation sent successfully'
      });
    } catch (error) {
      console.error('❌ Error in sendPatientInvitation controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send patient invitation'
      });
    }
  }

  /**
   * Manually confirm a medication reminder
   */
  async confirmMedicationManually(req: AuthenticatedRequest, res: Response) {
    try {
      const tutorId = req.user.userId;
      const { reminderId } = req.body as { reminderId?: string };
      if (!reminderId) {
        return res.status(400).json({ success: false, message: 'reminderId is required' });
      }

      const result = await tutorService.confirmMedicationManually(tutorId, reminderId);
      return res.json({ success: true, data: result, message: 'Medication confirmed manually' });
    } catch (error: any) {
      const msg = error?.message || 'Failed to confirm medication';
      return res.status(400).json({ success: false, message: msg });
    }
  }

  /**
   * Search tutor's patients
   */
  async searchPatients(req: AuthenticatedRequest, res: Response) {
    try {
      const tutorId = req.user.userId;
      const query = String(req.query.q || '').trim();
      if (!query) {
        return res.json({ success: true, data: [], message: 'Empty query' });
      }
      const data = await tutorService.searchPatients(tutorId, query);
      return res.json({ success: true, data, message: `Found ${data.length} patients` });
    } catch (error) {
      console.error('Error in searchPatients controller:', error);
      return res.status(500).json({ success: false, message: 'Failed to search patients' });
    }
  }

  /**
   * Get a patient's profile for this tutor
   */
  async getPatientProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const tutorId = req.user.userId;
      const { patientId } = req.params as { patientId: string };
      const data = await tutorService.getPatientProfile(tutorId, patientId);
      return res.json({ success: true, data, message: 'Patient profile loaded' });
    } catch (error: any) {
      const msg = error?.message || 'Failed to get patient profile';
      return res.status(400).json({ success: false, message: msg });
    }
  }

  /**
   * Get patient adherence history
   */
  async getPatientAdherenceHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const tutorId = req.user.userId;
      const { patientId } = req.params as { patientId: string };
      const daysBack = parseInt(req.query.days as string) || 30;

      console.log('📊 Getting adherence history for patient:', patientId);
      console.log('👨‍⚕️ Requested by tutor/doctor:', tutorId);
      console.log('📅 Days back:', daysBack);

      const data = await tutorService.getPatientAdherenceHistory(tutorId, patientId, daysBack);
      
      return res.json({ 
        success: true, 
        data, 
        message: 'Patient adherence history loaded successfully' 
      });
    } catch (error: any) {
      console.error('Error in getPatientAdherenceHistory controller:', error);
      const msg = error?.message || 'Failed to get patient adherence history';
      return res.status(400).json({ success: false, message: msg });
    }
  }

  /**
   * Create a prescription for a tutor's patient
   */
  async createPrescription(req: AuthenticatedRequest, res: Response) {
    try {
      const tutorId = req.user.userId;
      const { patientId, medicationName, medicationGenericName, medicationDosage, medicationForm, medicationDescription, medicationImageUrl, customDosage, instructions, schedules, isChronic, endDate, scheduleType, intervalHours } = req.body as any;

      if (!patientId || !medicationName || !Array.isArray(schedules) || schedules.length === 0) {
        return res.status(400).json({ success: false, message: 'patientId, medicationName and schedules are required' });
      }

      const created = await tutorService.createPrescriptionForPatient(tutorId, {
        patientId,
        medicationName,
        medicationGenericName,
        medicationDosage,
        medicationForm,
        medicationDescription,
        medicationImageUrl,
        customDosage,
        instructions,
        schedules,
        isChronic,
        endDate,
        scheduleType,
        intervalHours
      });

      return res.status(201).json({ success: true, data: created, message: 'Prescription créée' });
    } catch (error: any) {
      const msg = error?.message || 'Failed to create prescription';
      return res.status(400).json({ success: false, message: msg });
    }
  }

  /**
   * Update a prescription for a tutor's patient
   */
  async updatePrescription(req: AuthenticatedRequest, res: Response) {
    try {
      const tutorId = req.user.userId;
      const { prescriptionId } = req.params as { prescriptionId: string };
      const { medicationName, medicationGenericName, medicationDosage, medicationForm, medicationDescription, medicationImageUrl, customDosage, instructions, schedules, isChronic, endDate, scheduleType, intervalHours } = req.body as any;

      if (!prescriptionId) {
        return res.status(400).json({ success: false, message: 'prescriptionId is required' });
      }

      const updated = await tutorService.updatePrescriptionForPatient(tutorId, prescriptionId, {
        medicationName,
        medicationGenericName,
        medicationDosage,
        medicationForm,
        medicationDescription,
        medicationImageUrl,
        customDosage,
        instructions,
        schedules,
        isChronic,
        endDate,
        scheduleType,
        intervalHours
      });

      return res.json({ success: true, data: updated, message: 'Prescription mise à jour' });
    } catch (error: any) {
      const msg = error?.message || 'Failed to update prescription';
      return res.status(400).json({ success: false, message: msg });
    }
  }

  /**
   * Delete a prescription for a tutor's patient
   */
  async deletePrescription(req: AuthenticatedRequest, res: Response) {
    try {
      const tutorId = req.user.userId;
      const { prescriptionId } = req.params as { prescriptionId: string };

      if (!prescriptionId) {
        return res.status(400).json({ success: false, message: 'prescriptionId is required' });
      }

      const result = await tutorService.deletePrescriptionForPatient(tutorId, prescriptionId);

      return res.json({ success: true, data: result, message: 'Prescription supprimée' });
    } catch (error: any) {
      const msg = error?.message || 'Failed to delete prescription';
      return res.status(400).json({ success: false, message: msg });
    }
  }

  /**
   * Upload a voice message audio file (base64) to Firebase Storage and return a public URL
   */
  async uploadVoiceMessage(req: AuthenticatedRequest, res: Response) {
    try {
      console.log('🎤 uploadVoiceMessage called by user:', req.user.userId, 'type:', req.user.userType);
      console.log('🎤 Request body keys:', Object.keys(req.body));
      
      const { fileBase64, fileName, mimeType } = req.body as { fileBase64?: string; fileName?: string; mimeType?: string };
      if (!fileBase64) {
        console.log('❌ Missing fileBase64 in request');
        return res.status(400).json({ success: false, message: 'fileBase64 is required' });
      }
      
      console.log('🎤 File details - fileName:', fileName, 'mimeType:', mimeType, 'fileBase64 length:', fileBase64.length);

      // Check if Firebase Storage is available
      if (!firebaseStorageService.isAvailable()) {
        console.error('❌ Firebase Storage not available');
        return res.status(500).json({ 
          success: false, 
          message: 'Firebase Storage not configured. Please check environment variables.' 
        });
      }

      // Generate safe filename
      const extension = (mimeType && mimeType.includes('mpeg')) ? 'mp3' : (mimeType && mimeType.includes('wav') ? 'wav' : 'm4a');
      const safeName = (fileName && fileName.replace(/[^a-zA-Z0-9_\-.]/g, '')) || `voice_${Date.now()}.${extension}`;

      // Upload to Firebase Storage
      const uploadResult = await firebaseStorageService.uploadVoiceFile(
        fileBase64,
        safeName,
        mimeType || 'audio/m4a'
      );

      if (!uploadResult.success || !uploadResult.fileUrl) {
        console.error('❌ Firebase upload failed:', uploadResult.error);
        return res.status(500).json({ 
          success: false, 
          message: uploadResult.error || 'Failed to upload to Firebase Storage' 
        });
      }

      console.log('✅ Voice file uploaded to Firebase Storage');
      console.log('🔗 Public URL:', uploadResult.fileUrl);

      return res.json({ 
        success: true, 
        data: { fileUrl: uploadResult.fileUrl }, 
        message: 'File uploaded successfully to Firebase Storage' 
      });
    } catch (error) {
      console.error('Error uploading voice message:', error);
      return res.status(500).json({ success: false, message: 'Failed to upload file' });
    }
  }

  /**
   * Get all patients for the authenticated tutor
   */
  async getAllPatients(req: AuthenticatedRequest, res: Response) {
    try {
      const tutorId = req.user.userId;
      
      const patients = await tutorService.getAllPatientsForTutor(tutorId);
      
      res.json({
        success: true,
        data: patients,
        message: `Found ${patients.length} patients`
      });
    } catch (error) {
      console.error('Error in getAllPatients controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get all patients'
      });
    }
  }

  /**
   * Delete patient relationship (works for both tuteur and medecin)
   */
  async deletePatient(req: AuthenticatedRequest, res: Response) {
    try {
      const caregiverId = req.user.userId;
      const { patientId } = req.params;

      const result = await tutorService.deletePatient(caregiverId, patientId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error deleting patient:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error deleting patient relationship',
        error: error.message 
      });
    }
  }

  /**
   * Get tutor's voice messages
   */
  async getVoiceMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const tutorId = req.user.userId;
      const { patientId } = req.query as { patientId?: string };
      const data = await tutorService.getVoiceMessages(tutorId, patientId);
      return res.json({ success: true, data });
    } catch (error) {
      console.error('Error in getVoiceMessages controller:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch voice messages' });
    }
  }

  /**
   * Create new voice message entry (after upload)
   */
  async createVoiceMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const tutorId = req.user.userId;
      const { patientId, fileUrl, fileName, title, durationSeconds } = req.body as any;
      if (!patientId || !fileUrl) {
        return res.status(400).json({ success: false, message: 'patientId and fileUrl are required' });
      }
      const created = await tutorService.createVoiceMessage(tutorId, { patientId, fileUrl, fileName, title, durationSeconds });
      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error?.message || 'Failed to create voice message' });
    }
  }

  /**
   * Delete a voice message
   */
  async deleteVoiceMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const tutorId = req.user.userId;
      const { id } = req.params as any;
      const result = await tutorService.deleteVoiceMessage(tutorId, id);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error?.message || 'Failed to delete voice message' });
    }
  }

  /**
   * Generate medication reminders for today (manual trigger)
   */
  async generateTodaysReminders(req: AuthenticatedRequest, res: Response) {
    try {
      await reminderGeneratorService.generateTodaysReminders();
      return res.json({
        success: true,
        message: 'Reminders generated successfully for today'
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to generate reminders'
      });
    }
  }

  /**
   * Generate medication reminders for the next N days
   */
  async generateRemindersForNextDays(req: AuthenticatedRequest, res: Response) {
    try {
      const { days = 7 } = req.body;
      await reminderGeneratorService.generateRemindersForNextDays(days);
      return res.json({
        success: true,
        message: `Reminders generated successfully for the next ${days} days`
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to generate reminders'
      });
    }
  }

  /**
   * Link existing reminders to voice messages (repair utility)
   */
  async linkRemindersToVoiceMessages(req: AuthenticatedRequest, res: Response) {
    try {
      await reminderGeneratorService.linkExistingRemindersToVoiceMessages();
      return res.json({
        success: true,
        message: 'Reminders linked to voice messages successfully'
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to link reminders to voice messages'
      });
    }
  }
}

export default new TutorController();
