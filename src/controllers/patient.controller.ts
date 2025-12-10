import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { patientService } from '../services/patient.service.js';

class PatientController {
  /**
   * Get complete dashboard data for the authenticated patient
   */
  async getDashboardData(req: AuthenticatedRequest, res: Response) {
    try {
      const patientId = req.user.userId;
      
      const dashboardData = await patientService.getDashboardData(patientId);
      
      res.json({
        success: true,
        data: dashboardData,
        message: 'Dashboard data retrieved successfully'
      });
    } catch (error: any) {
      console.error('Error in getDashboardData controller:', error);
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to get dashboard data'
      });
    }
  }

  /**
   * Get overdue medications for the authenticated patient
   */
  async getOverdueMedications(req: AuthenticatedRequest, res: Response) {
    try {
      const patientId = req.user.userId;
      
      const overdueMedications = await patientService.getOverdueMedications(patientId);
      
      res.json({
        success: true,
        data: overdueMedications,
        message: `Found ${overdueMedications.length} overdue medications`
      });
    } catch (error: any) {
      console.error('Error in getOverdueMedications controller:', error);
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to get overdue medications'
      });
    }
  }

  /**
   * Get next upcoming medications for the authenticated patient
   */
  async getNextMedications(req: AuthenticatedRequest, res: Response) {
    try {
      const patientId = req.user.userId;
      const limit = parseInt(req.query.limit as string) || 5;
      
      const nextMedications = await patientService.getNextMedications(patientId, limit);
      
      res.json({
        success: true,
        data: nextMedications,
        message: `Found ${nextMedications.length} upcoming medications`
      });
    } catch (error: any) {
      console.error('Error in getNextMedications controller:', error);
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to get next medications'
      });
    }
  }

  /**
   * Get latest messages from tutors for the authenticated patient
   */
  async getTutorMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const patientId = req.user.userId;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const tutorMessages = await patientService.getTutorMessages(patientId, limit);
      
      res.json({
        success: true,
        data: tutorMessages,
        message: `Found ${tutorMessages.length} messages`
      });
    } catch (error: any) {
      console.error('Error in getTutorMessages controller:', error);
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to get tutor messages'
      });
    }
  }

  // This function is unused - patients use the notification controller for marking medications as taken
  // Keeping for potential future use or API compatibility

  /**
   * Mark a tutor message as read by the authenticated patient
   */
  async markMessageRead(req: AuthenticatedRequest, res: Response) {
    try {
      const patientId = req.user.userId;
      const { messageId } = req.body;

      if (!messageId) {
        return res.status(400).json({
          success: false,
          message: 'Message ID is required'
        });
      }

      await patientService.markMessageRead(patientId, messageId);

      res.json({
        success: true,
        message: 'Message marked as read successfully'
      });
    } catch (error: any) {
      console.error('Error in markMessageRead controller:', error);
      res.status(400).json({
        success: false,
        message: error?.message || 'Failed to mark message as read'
      });
    }
  }

  /**
   * Get all medications for the authenticated patient
   */
  async getPatientMedications(req: AuthenticatedRequest, res: Response) {
    try {
      const patientId = req.user.userId;

      const medications = await patientService.getPatientMedications(patientId);

      res.json({
        success: true,
        data: medications,
        message: `Found ${medications.length} medications`
      });
    } catch (error: any) {
      console.error('Error in getPatientMedications controller:', error);
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to get patient medications'
      });
    }
  }

  /**
   * Get all messages for the authenticated patient from doctors and tutors
   */
  async getPatientMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const patientId = req.user.userId;
      const limit = parseInt(req.query.limit as string) || 50;

      const messages = await patientService.getPatientMessages(patientId, limit);

      res.json({
        success: true,
        data: messages,
        message: `Found ${messages.length} messages`
      });
    } catch (error: any) {
      console.error('Error in getPatientMessages controller:', error);
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to get patient messages'
      });
    }
  }

  /**
   * Get patient profile data for the authenticated patient
   */
  async getPatientProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const patientId = req.user.userId;

      const profile = await patientService.getPatientProfile(patientId);

      res.json({
        success: true,
        data: profile,
        message: 'Profile data retrieved successfully'
      });
    } catch (error: any) {
      console.error('Error in getPatientProfile controller:', error);
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to get patient profile'
      });
    }
  }

  /**
   * Update patient profile data for the authenticated patient
   */
  async updatePatientProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const patientId = req.user.userId;
      const profileData = req.body;

      await patientService.updatePatientProfile(patientId, profileData);

      res.json({
        success: true,
        message: 'Profile updated successfully'
      });
    } catch (error: any) {
      console.error('Error in updatePatientProfile controller:', error);
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to update patient profile'
      });
    }
  }

  /**
   * Get medications for a specific date for the authenticated patient
   */
  async getMedicationsByDate(req: AuthenticatedRequest, res: Response) {
    try {
      const patientId = req.user.userId;
      const { date } = req.query;

      if (!date || typeof date !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Date parameter is required (format: YYYY-MM-DD)'
        });
      }

      const medications = await patientService.getMedicationsByDate(patientId, date);

      res.json({
        success: true,
        data: medications,
        message: 'Medications retrieved successfully'
      });
    } catch (error: any) {
      console.error('Error in getMedicationsByDate controller:', error);
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to get medications for date'
      });
    }
  }

  /**
   * Get upcoming medication reminders with voice messages for offline sync
   */
  async getUpcomingReminders(req: AuthenticatedRequest, res: Response) {
    try {
      const patientId = req.user.userId;
      const daysAhead = parseInt(req.query.days as string) || 30;
      const lastSyncTime = req.query.lastSync 
        ? new Date(req.query.lastSync as string)
        : undefined;

      console.log('📱 Getting upcoming reminders for offline sync');
      console.log('Patient ID:', patientId);
      console.log('Days ahead:', daysAhead);
      console.log('Last sync time:', lastSyncTime?.toISOString() || 'Never');

      const reminders = await patientService.getUpcomingReminders(patientId, daysAhead);
      
      // Get deleted prescriptions since last sync
      const deletedPrescriptions = lastSyncTime 
        ? await patientService.getDeletedPrescriptions(patientId, lastSyncTime)
        : [];

      res.json({
        success: true,
        data: reminders,
        deletedPrescriptions: deletedPrescriptions,
        message: `Found ${reminders.length} upcoming reminders, ${deletedPrescriptions.length} deleted prescriptions`
      });
    } catch (error: any) {
      console.error('Error in getUpcomingReminders controller:', error);
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to get upcoming reminders'
      });
    }
  }

  /**
   * Check if patient has updates since last sync
   */
  async checkForUpdates(req: AuthenticatedRequest, res: Response) {
    try {
      const patientId = req.user.userId;
      const lastSyncTime = req.query.lastSync 
        ? new Date(req.query.lastSync as string)
        : undefined;

      console.log('🔍 Checking for updates');
      console.log('Patient ID:', patientId);
      console.log('Last sync time:', lastSyncTime?.toISOString() || 'Never');

      const updateStatus = await patientService.checkForUpdates(patientId, lastSyncTime);

      res.json({
        success: true,
        data: updateStatus,
        message: updateStatus.hasUpdates 
          ? 'Updates available' 
          : 'No updates available'
      });
    } catch (error: any) {
      console.error('Error in checkForUpdates controller:', error);
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to check for updates'
      });
    }
  }

  /**
   * Confirm a medication reminder (mark as taken)
   */
  async confirmReminder(req: AuthenticatedRequest, res: Response) {
    try {
      const patientId = req.user.userId;
      const { reminderIds } = req.body;

      if (!reminderIds || !Array.isArray(reminderIds) || reminderIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Reminder IDs array is required'
        });
      }

      console.log(`📍 Confirming reminders for patient ${patientId}:`, reminderIds);

      // Confirm each reminder
      const results = [];
      for (const reminderId of reminderIds) {
        try {
          await patientService.markMedicationTaken(patientId, reminderId);
          results.push({ reminderId, success: true });
        } catch (error: any) {
          console.error(`Error confirming reminder ${reminderId}:`, error.message);
          results.push({ reminderId, success: false, error: error.message });
        }
      }

      res.json({
        success: true,
        data: results,
        message: `Processed ${results.length} reminders`
      });
    } catch (error: any) {
      console.error('Error in confirmReminder controller:', error);
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to confirm reminders'
      });
    }
  }

  /**
   * Snooze a medication reminder
   */
  async snoozeReminder(req: AuthenticatedRequest, res: Response) {
    try {
      const patientId = req.user.userId;
      const { reminderId, snoozeDurationMinutes = 5 } = req.body;

      if (!reminderId) {
        return res.status(400).json({
          success: false,
          message: 'Reminder ID is required'
        });
      }

      console.log(`⏰ Snoozing reminder ${reminderId} for ${snoozeDurationMinutes} minutes`);

      // Calculate new snooze time
      const snoozedUntil = new Date(Date.now() + snoozeDurationMinutes * 60 * 1000);

      // Update the reminder with snooze info
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      await prisma.medicationReminder.update({
        where: { id: reminderId },
        data: {
          status: 'scheduled',
          snoozedUntil: snoozedUntil
        }
      });

      await prisma.$disconnect();

      res.json({
        success: true,
        data: { reminderId, snoozedUntil: snoozedUntil.toISOString() },
        message: `Reminder snoozed until ${snoozedUntil.toLocaleTimeString()}`
      });
    } catch (error: any) {
      console.error('Error in snoozeReminder controller:', error);
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to snooze reminder'
      });
    }
  }
}

export default new PatientController();
