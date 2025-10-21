import prisma from '../config/database.js';

// Types for patient dashboard data
export interface OverdueMedication {
  id: string;
  medicationName: string;
  dosage: string;
  scheduledFor: Date;
  minutesOverdue: number;
  prescriptionId: string;
  reminderId: string;
}

export interface NextMedication {
  id: string;
  medicationName: string;
  dosage: string;
  scheduledFor: Date;
  minutesUntil: number;
  prescriptionId: string;
  reminderId: string;
}

export interface TutorMessage {
  id: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  tutorName: string;
  tutorId: string;
}

export interface PatientMessage {
  id: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  senderName: string;
  senderId: string;
  senderType: 'doctor' | 'tutor';
  messageType: 'alert' | 'reminder' | 'general' | 'voice';
  priority?: 'low' | 'medium' | 'high';
  fileUrl?: string; // For voice messages
  durationSeconds?: number; // For voice messages
}

export interface PatientProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: Date;
  address?: string;
  emergencyContact?: string;
  medicalConditions?: string[];
  allergies?: string[];
  totalMedications: number;
  adherenceRate: number;
  lastActivity: string;
}

export interface PatientDashboardData {
  overdueMedications: OverdueMedication[];
  nextMedications: NextMedication[];
  tutorMessages: TutorMessage[];
  totalMedicationsToday: number;
  takenToday: number;
  adherenceRate: number;
}

export interface PatientMedication {
  id: string;
  medicationName: string;
  dosage: string;
  prescribedBy: string;
  startDate: Date;
  endDate?: Date | null;
  isChronic: boolean;
  isActive: boolean;
  schedules: MedicationSchedule[];
  adherenceRate?: number;
  totalDoses?: number;
  takenDoses?: number;
}

export interface MedicationSchedule {
  id: string;
  scheduledTime: Date;
  daysOfWeek: number[];
  scheduleType: string;
  isActive: boolean;
}

export class PatientService {
  /**
   * Get overdue medications for a patient
   */
  async getOverdueMedications(patientId: string): Promise<OverdueMedication[]> {
    try {
      const now = new Date();
      
      // Get overdue reminders (scheduled in the past and not confirmed)
      const overdueReminders = await prisma.medicationReminder.findMany({
        where: {
          patientId,
          scheduledFor: {
            lt: now
          },
          status: {
            in: ['scheduled', 'sent']
          }
        },
        include: {
          prescription: {
            include: {
              medication: true
            }
          }
        },
        orderBy: {
          scheduledFor: 'desc'
        }
      });

      return overdueReminders.map(reminder => {
        const minutesOverdue = Math.floor((now.getTime() - reminder.scheduledFor.getTime()) / (1000 * 60));
        
        return {
          id: reminder.id,
          medicationName: reminder.prescription.medication.name,
          dosage: reminder.prescription.customDosage || reminder.prescription.medication.dosage || 'Dose non spécifiée',
          scheduledFor: reminder.scheduledFor,
          minutesOverdue,
          prescriptionId: reminder.prescriptionId,
          reminderId: reminder.id
        };
      });
    } catch (error) {
      console.error('Error getting overdue medications:', error);
      throw new Error('Failed to get overdue medications');
    }
  }

  /**
   * Get next upcoming medications for a patient
   */
  async getNextMedications(patientId: string, limit: number = 5): Promise<NextMedication[]> {
    try {
      const now = new Date();
      
      // Get upcoming reminders (scheduled in the future)
      const upcomingReminders = await prisma.medicationReminder.findMany({
        where: {
          patientId,
          scheduledFor: {
            gte: now
          },
          status: {
            in: ['scheduled', 'sent']
          }
        },
        include: {
          prescription: {
            include: {
              medication: true
            }
          }
        },
        orderBy: {
          scheduledFor: 'asc'
        },
        take: limit
      });

      return upcomingReminders.map(reminder => {
        const minutesUntil = Math.floor((reminder.scheduledFor.getTime() - now.getTime()) / (1000 * 60));
        
        return {
          id: reminder.id,
          medicationName: reminder.prescription.medication.name,
          dosage: reminder.prescription.customDosage || reminder.prescription.medication.dosage || 'Dose non spécifiée',
          scheduledFor: reminder.scheduledFor,
          minutesUntil,
          prescriptionId: reminder.prescriptionId,
          reminderId: reminder.id
        };
      });
    } catch (error) {
      console.error('Error getting next medications:', error);
      throw new Error('Failed to get next medications');
    }
  }

  /**
   * Get latest messages from tutors for a patient
   */
  async getTutorMessages(patientId: string, limit: number = 10): Promise<TutorMessage[]> {
    try {
      // Get recent alerts and notifications for this patient
      const alerts = await prisma.alert.findMany({
        where: {
          patientId
        },
        include: {
          tuteur: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      return alerts.map(alert => ({
        id: alert.id,
        message: alert.message,
        timestamp: alert.createdAt,
        isRead: alert.isRead,
        tutorName: `${alert.tuteur.firstName} ${alert.tuteur.lastName}`,
        tutorId: alert.tuteurId
      }));
    } catch (error) {
      console.error('Error getting tutor messages:', error);
      throw new Error('Failed to get tutor messages');
    }
  }

  /**
   * Get complete dashboard data for a patient
   */
  async getDashboardData(patientId: string): Promise<PatientDashboardData> {
    try {
      // Get all dashboard data in parallel
      const [overdueMedications, nextMedications, tutorMessages] = await Promise.all([
        this.getOverdueMedications(patientId),
        this.getNextMedications(patientId),
        this.getTutorMessages(patientId)
      ]);

      // Calculate today's medication stats
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const todaysReminders = await prisma.medicationReminder.findMany({
        where: {
          patientId,
          scheduledFor: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });

      const totalMedicationsToday = todaysReminders.length;
      const takenToday = todaysReminders.filter(r => 
        r.status === 'confirmed' || r.status === 'manual_confirm'
      ).length;

      const adherenceRate = totalMedicationsToday > 0 
        ? Math.round((takenToday / totalMedicationsToday) * 100)
        : 100;

      return {
        overdueMedications,
        nextMedications,
        tutorMessages,
        totalMedicationsToday,
        takenToday,
        adherenceRate
      };
    } catch (error) {
      console.error('Error getting patient dashboard data:', error);
      throw new Error('Failed to get patient dashboard data');
    }
  }

  /**
   * Mark a medication as taken
   */
  async markMedicationTaken(patientId: string, reminderId: string): Promise<void> {
    try {
      // Verify the reminder belongs to this patient
      const reminder = await prisma.medicationReminder.findFirst({
        where: {
          id: reminderId,
          patientId
        }
      });

      if (!reminder) {
        throw new Error('Reminder not found or does not belong to this patient');
      }

      // Update reminder status
      await prisma.medicationReminder.update({
        where: { id: reminderId },
        data: {
          status: 'manual_confirm',
          confirmedAt: new Date(),
          confirmedBy: patientId
        }
      });

      // Create confirmation record
      await prisma.medicationConfirmation.create({
        data: {
          reminderId,
          confirmedBy: patientId,
          confirmationType: 'patient',
          confirmedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error marking medication as taken:', error);
      throw new Error('Failed to mark medication as taken');
    }
  }

  /**
   * Mark a tutor message as read
   */
  async markMessageRead(patientId: string, messageId: string): Promise<void> {
    try {
      // First, try to find the message in alerts table
      const alert = await prisma.alert.findFirst({
        where: {
          id: messageId,
          patientId
        }
      });

      if (alert) {
        // Mark alert as read
        await prisma.alert.update({
          where: { id: messageId },
          data: {
            isRead: true,
            readAt: new Date()
          }
        });
        return;
      }

      // If not found in alerts, check if it's a voice message
      const voiceMessage = await prisma.voiceMessage.findFirst({
        where: {
          id: messageId,
          patientId
        }
      });

      if (voiceMessage) {
        // Voice messages don't have read status in current schema
        // We could add a separate table for voice message read status
        // For now, we'll just return success
        console.log(`Voice message ${messageId} marked as read (no DB update needed)`);
        return;
      }

      // If it's a prescription instruction message, it's already considered read
      if (messageId.startsWith('prescription-instruction-')) {
        console.log(`Prescription instruction ${messageId} marked as read (no DB update needed)`);
        return;
      }

      throw new Error('Message not found or does not belong to this patient');
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw new Error('Failed to mark message as read');
    }
  }

  /**
   * Get all medications for a patient with detailed information
   */
  async getPatientMedications(patientId: string): Promise<PatientMedication[]> {
    try {
      // Get all prescriptions for this patient
      const prescriptions = await prisma.prescription.findMany({
        where: {
          patientId
        },
        include: {
          medication: true,
          doctor: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          schedules: {
            where: {
              isActive: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Calculate adherence for each prescription
      const medicationsWithAdherence = await Promise.all(
        prescriptions.map(async (prescription) => {
          // Calculate adherence rate for the last 30 days
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const totalReminders = await prisma.medicationReminder.count({
            where: {
              prescriptionId: prescription.id,
              patientId,
              scheduledFor: {
                gte: thirtyDaysAgo
              }
            }
          });

          const takenReminders = await prisma.medicationReminder.count({
            where: {
              prescriptionId: prescription.id,
              patientId,
              scheduledFor: {
                gte: thirtyDaysAgo
              },
              status: {
                in: ['confirmed', 'manual_confirm']
              }
            }
          });

          const adherenceRate = totalReminders > 0
            ? Math.round((takenReminders / totalReminders) * 100)
            : 0;

          return {
            id: prescription.id,
            medicationName: prescription.medication.name,
            dosage: prescription.customDosage || prescription.medication.dosage || 'Dose non spécifiée',
            prescribedBy: `${prescription.doctor.firstName} ${prescription.doctor.lastName}`,
            startDate: prescription.startDate,
            endDate: prescription.endDate,
            isChronic: prescription.isChronic,
            isActive: prescription.isActive,
            schedules: prescription.schedules.map((schedule: any) => ({
              id: schedule.id,
              scheduledTime: schedule.scheduledTime,
              daysOfWeek: schedule.daysOfWeek,
              scheduleType: schedule.scheduleType,
              isActive: schedule.isActive
            })),
            adherenceRate,
            totalDoses: totalReminders,
            takenDoses: takenReminders
          };
        })
      );

      return medicationsWithAdherence;
    } catch (error) {
      console.error('Error getting patient medications:', error);
      throw new Error('Failed to get patient medications');
    }
  }

  /**
   * Get all messages for a patient from doctors and tutors
   */
  async getPatientMessages(patientId: string, limit: number = 50): Promise<PatientMessage[]> {
    try {
      // Get alerts from tutors
      const tutorAlerts = await prisma.alert.findMany({
        where: {
          patientId
        },
        include: {
          tuteur: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              userType: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Get voice messages from tutors
      const voiceMessages = await prisma.voiceMessage.findMany({
        where: {
          patientId
        },
        include: {
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              userType: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Get prescription-related messages from doctors
      const prescriptions = await prisma.prescription.findMany({
        where: {
          patientId
        },
        include: {
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              userType: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Combine all messages
      const allMessages: PatientMessage[] = [];

      // Add tutor alerts
      tutorAlerts.forEach(alert => {
        allMessages.push({
          id: alert.id,
          message: alert.message,
          timestamp: alert.createdAt,
          isRead: alert.isRead,
          senderName: `${alert.tuteur.firstName} ${alert.tuteur.lastName}`,
          senderId: alert.tuteurId,
          senderType: 'tutor',
          messageType: alert.alertType === 'missed_medication' ? 'alert' : 'general',
          priority: alert.alertType === 'missed_medication' ? 'high' : 'medium'
        });
      });

      // Add voice messages
      voiceMessages.forEach(voice => {
        allMessages.push({
          id: voice.id,
          message: `Message vocal (${voice.durationSeconds}s)`,
          timestamp: voice.createdAt,
          isRead: true, // Voice messages don't have read status in current schema
          senderName: `${voice.creator.firstName} ${voice.creator.lastName}`,
          senderId: voice.creatorId,
          senderType: 'tutor',
          messageType: 'voice',
          priority: 'medium',
          fileUrl: voice.fileUrl,
          durationSeconds: voice.durationSeconds
        });
      });

      // Add prescription messages from doctors
      prescriptions.forEach(prescription => {
        // Create a message for each prescription
        const message = `Nouvelle prescription: ${prescription.customDosage || 'Dosage standard'}`;
        if (prescription.instructions) {
          // Add instruction as a separate message
          allMessages.push({
            id: `prescription-instruction-${prescription.id}`,
            message: `Instructions: ${prescription.instructions}`,
            timestamp: prescription.createdAt,
            isRead: true, // Assume prescription instructions are read when viewed
            senderName: `${prescription.doctor.firstName} ${prescription.doctor.lastName}`,
            senderId: prescription.prescribedBy,
            senderType: 'doctor',
            messageType: 'general',
            priority: 'medium'
          });
        }
      });

      // Sort all messages by timestamp (newest first)
      allMessages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Limit results
      return allMessages.slice(0, limit);
    } catch (error) {
      console.error('Error getting patient messages:', error);
      throw new Error('Failed to get patient messages');
    }
  }

  /**
   * Get patient profile data
   */
  async getPatientProfile(patientId: string): Promise<PatientProfileData> {
    try {
      // Get patient user data
      const patient = await prisma.user.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!patient) {
        throw new Error('Patient not found');
      }

      // Get total medications count
      const totalMedications = await prisma.prescription.count({
        where: {
          patientId,
          isActive: true
        }
      });

      // Calculate adherence rate (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const totalReminders = await prisma.medicationReminder.count({
        where: {
          patientId,
          scheduledFor: {
            gte: thirtyDaysAgo
          }
        }
      });

      const takenReminders = await prisma.medicationReminder.count({
        where: {
          patientId,
          scheduledFor: {
            gte: thirtyDaysAgo
          },
          status: {
            in: ['confirmed', 'manual_confirm']
          }
        }
      });

      const adherenceRate = totalReminders > 0
        ? Math.round((takenReminders / totalReminders) * 100)
        : 0;

      // Get last activity (most recent medication reminder or alert)
      const lastReminder = await prisma.medicationReminder.findFirst({
        where: { patientId },
        orderBy: { createdAt: 'desc' }
      });

      const lastAlert = await prisma.alert.findFirst({
        where: { patientId },
        orderBy: { createdAt: 'desc' }
      });

      let lastActivity = 'Aucune activité';
      const lastReminderTime = lastReminder?.createdAt;
      const lastAlertTime = lastAlert?.createdAt;

      if (lastReminderTime || lastAlertTime) {
        const mostRecentTime = lastReminderTime && lastAlertTime
          ? (lastReminderTime > lastAlertTime ? lastReminderTime : lastAlertTime)
          : (lastReminderTime || lastAlertTime);

        if (mostRecentTime) {
          const diffInHours = (new Date().getTime() - mostRecentTime.getTime()) / (1000 * 60 * 60);
          if (diffInHours < 1) {
            lastActivity = `Il y a ${Math.floor(diffInHours * 60)} min`;
          } else if (diffInHours < 24) {
            lastActivity = `Il y a ${Math.floor(diffInHours)}h`;
          } else {
            lastActivity = `Il y a ${Math.floor(diffInHours / 24)} jour(s)`;
          }
        }
      }

      // TODO: Add medical conditions and allergies when those tables are implemented
      const medicalConditions: string[] = [];
      const allergies: string[] = [];

      return {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phoneNumber,
        dateOfBirth: undefined, // Not in current schema
        address: undefined, // Not in current schema
        emergencyContact: undefined, // Not in current schema
        medicalConditions,
        allergies,
        totalMedications,
        adherenceRate,
        lastActivity
      };
    } catch (error) {
      console.error('Error getting patient profile:', error);
      throw new Error('Failed to get patient profile');
    }
  }

  /**
   * Update patient profile data
   */
  async updatePatientProfile(patientId: string, profileData: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    emergencyContact?: string;
  }): Promise<void> {
    try {
      // Validate that the patient exists
      const patient = await prisma.user.findUnique({
        where: { id: patientId }
      });

      if (!patient) {
        throw new Error('Patient not found');
      }

      // Update patient data (only fields that exist in schema)
      await prisma.user.update({
        where: { id: patientId },
        data: {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phoneNumber: profileData.phone,
          // Note: address and emergencyContact are not in current schema
          // They would need to be added to the User model if needed
        }
      });
    } catch (error) {
      console.error('Error updating patient profile:', error);
      throw new Error('Failed to update patient profile');
    }
  }

  /**
   * Get medications for a specific date for a patient
   */
  async getMedicationsByDate(patientId: string, dateStr: string) {
    try {
      // Parse the date string (format: YYYY-MM-DD)
      const targetDate = new Date(dateStr);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      console.log('🔍 Fetching medications for patient:', patientId);
      console.log('📅 Date range:', startOfDay, 'to', endOfDay);

      // Get all medication reminders for this date
      // IMPORTANT: Filter out reminders for deleted/inactive prescriptions
      const reminders = await prisma.medicationReminder.findMany({
        where: {
          patientId: patientId,
          scheduledFor: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: {
            not: 'cancelled' // Don't show cancelled reminders
          },
          prescription: {
            isActive: true, // Only show reminders for active prescriptions
            deletedAt: null // Don't show deleted prescriptions
          }
        },
        include: {
          prescription: {
            include: {
              medication: true
            }
          }
        },
        orderBy: {
          scheduledFor: 'asc'
        }
      });

      // Transform to medications format
      const medications = reminders.map(reminder => {
        // Map database status to frontend status
        let frontendStatus: 'pending' | 'taken' | 'missed' | 'scheduled' = 'pending';
        if (reminder.status === 'confirmed' || reminder.status === 'manual_confirm') {
          frontendStatus = 'taken';
        } else if (reminder.status === 'missed') {
          frontendStatus = 'missed';
        } else if (reminder.status === 'sent') {
          frontendStatus = 'pending';
        } else if (reminder.status === 'scheduled') {
          frontendStatus = 'scheduled';
        }
        
        return {
          id: reminder.id,
          medicationName: reminder.prescription.medication.name,
          dosage: reminder.prescription.customDosage || reminder.prescription.medication.dosage || 'Non spécifié',
          scheduledFor: reminder.scheduledFor.toISOString(),
          status: frontendStatus,
          reminderId: reminder.id,
          prescriptionId: reminder.prescriptionId
        };
      });

      // Calculate stats for the day
      const total = medications.length;
      const taken = reminders.filter(r => 
        r.status === 'confirmed' || r.status === 'manual_confirm'
      ).length;
      const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

      return {
        medications,
        total,
        taken,
        adherenceRate
      };
    } catch (error) {
      console.error('Error getting medications by date:', error);
      throw new Error('Failed to get medications for date');
    }
  }

  /**
   * Get upcoming medication reminders with voice messages for offline sync
   */
  async getUpcomingReminders(patientId: string, daysAhead: number = 30) {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + daysAhead);

      console.log('🔍 Fetching upcoming reminders for patient:', patientId);
      console.log('📅 Date range:', now.toISOString(), 'to', futureDate.toISOString());

      // Get all upcoming medication reminders with voice messages
      // IMPORTANT: Filter out reminders for deleted/inactive prescriptions
      const reminders = await prisma.medicationReminder.findMany({
        where: {
          patientId: patientId,
          scheduledFor: {
            gte: now,
            lte: futureDate
          },
          status: {
            in: ['scheduled', 'sent']
          },
          prescription: {
            isActive: true, // Only get reminders for active prescriptions
            deletedAt: null // Don't include deleted prescriptions
          }
        },
        include: {
          prescription: {
            include: {
              medication: true,
              voiceMessage: true  // Include prescription's voice message
            }
          },
          voiceMessage: true,
          standardVoiceMessage: true
        },
        orderBy: {
          scheduledFor: 'asc'
        }
      });

      // Transform to include voice URL with fallback logic
      const transformedReminders = reminders.map(reminder => {
        // Voice priority: 
        // 1. Prescription's specific voice message
        // 2. Reminder's linked voice message
        // 3. Standard voice message
        // 4. null
        let voiceUrl = null;
        let voiceFileName = null;
        let voiceTitle = null;
        let voiceDuration = 0;

        // Debug logging
        console.log(`🔍 Processing reminder: ${reminder.prescription.medication.name}`);
        console.log(`   Prescription voiceMessageId: ${(reminder.prescription as any).voiceMessageId || 'null'}`);
        console.log(`   Prescription.voiceMessage exists: ${!!reminder.prescription.voiceMessage}`);
        console.log(`   Reminder.voiceMessage exists: ${!!reminder.voiceMessage}`);
        console.log(`   Reminder.standardVoiceMessage exists: ${!!reminder.standardVoiceMessage}`);

        // Priority 1: Check prescription's voice message
        if (reminder.prescription.voiceMessage && reminder.prescription.voiceMessage.isActive) {
          voiceUrl = reminder.prescription.voiceMessage.fileUrl;
          voiceFileName = reminder.prescription.voiceMessage.fileName;
          voiceTitle = reminder.prescription.voiceMessage.title;
          voiceDuration = reminder.prescription.voiceMessage.durationSeconds;
          console.log(`   ✅ Using prescription voice: ${voiceUrl}`);
        }
        // Priority 2: Check reminder's voice message
        else if (reminder.voiceMessage && reminder.voiceMessage.isActive) {
          voiceUrl = reminder.voiceMessage.fileUrl;
          voiceFileName = reminder.voiceMessage.fileName;
          voiceTitle = reminder.voiceMessage.title;
          voiceDuration = reminder.voiceMessage.durationSeconds;
          console.log(`   ✅ Using reminder voice: ${voiceUrl}`);
        }
        // Priority 3: Check standard voice message
        else if (reminder.standardVoiceMessage && reminder.standardVoiceMessage.isActive) {
          voiceUrl = reminder.standardVoiceMessage.fileUrl;
          voiceFileName = `standard_${reminder.standardVoiceMessage.messageKey}.m4a`;
          voiceTitle = reminder.standardVoiceMessage.description;
          voiceDuration = reminder.standardVoiceMessage.durationSeconds;
          console.log(`   ✅ Using standard voice: ${voiceUrl}`);
        } else {
          console.log(`   ℹ️ No voice message found for this reminder`);
        }

        return {
          id: reminder.id,
          reminderId: reminder.id,
          prescriptionId: reminder.prescriptionId,
          medicationName: reminder.prescription.medication.name,
          dosage: reminder.prescription.customDosage || reminder.prescription.medication.dosage || 'Non spécifié',
          instructions: reminder.prescription.instructions,
          imageUrl: reminder.prescription.medication.imageUrl,
          scheduledFor: reminder.scheduledFor.toISOString(),
          status: reminder.status,
          voiceUrl: voiceUrl,
          voiceFileName: voiceFileName,
          voiceTitle: voiceTitle,
          voiceDuration: voiceDuration,
          patientId: reminder.patientId
        };
      });

      console.log(`✅ Found ${transformedReminders.length} upcoming reminders`);
      return transformedReminders;
    } catch (error) {
      console.error('Error getting upcoming reminders:', error);
      throw new Error('Failed to get upcoming reminders');
    }
  }

  /**
   * Check if patient has updates since last sync
   */
  async checkForUpdates(patientId: string, lastSyncTime?: Date) {
    try {
      if (!lastSyncTime) {
        return { hasUpdates: true, lastModified: new Date() };
      }

      // Check if any prescriptions have been modified since last sync
      const modifiedPrescriptions = await prisma.prescription.findMany({
        where: {
          patientId: patientId,
          OR: [
            { updatedAt: { gt: lastSyncTime } },
            { createdAt: { gt: lastSyncTime } }
          ]
        },
        select: { id: true, updatedAt: true }
      });

      // Check if any voice messages have been modified
      const modifiedVoiceMessages = await prisma.voiceMessage.findMany({
        where: {
          patientId: patientId,
          OR: [
            { updatedAt: { gt: lastSyncTime } },
            { createdAt: { gt: lastSyncTime } }
          ]
        },
        select: { id: true, updatedAt: true }
      });

      const hasUpdates = modifiedPrescriptions.length > 0 || modifiedVoiceMessages.length > 0;
      const lastModified = hasUpdates 
        ? new Date(Math.max(
            ...modifiedPrescriptions.map(p => p.updatedAt.getTime()),
            ...modifiedVoiceMessages.map(v => v.updatedAt.getTime())
          ))
        : lastSyncTime;

      return { hasUpdates, lastModified };
    } catch (error) {
      console.error('Error checking for updates:', error);
      throw new Error('Failed to check for updates');
    }
  }

  /**
   * Get comprehensive adherence history for a patient
   */
  async getPatientAdherenceHistory(patientId: string, daysBack: number = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      console.log('📊 Fetching adherence history for patient:', patientId);
      console.log('📅 Date range:', startDate.toISOString(), 'to', endDate.toISOString());

      // Get all reminders in the date range
      const reminders = await prisma.medicationReminder.findMany({
        where: {
          patientId: patientId,
          scheduledFor: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          prescription: {
            include: {
              medication: true
            }
          }
        },
        orderBy: {
          scheduledFor: 'desc'
        }
      });

      // Calculate overall statistics with proper missed logic
      const now = new Date();
      const totalReminders = reminders.length;
      
      const takenReminders = reminders.filter(r => 
        r.status === 'confirmed' || r.status === 'manual_confirm'
      ).length;
      
      // Missed = explicitly marked as missed OR past due and not taken
      const missedReminders = reminders.filter(r => {
        if (r.status === 'missed') return true;
        if ((r.status === 'scheduled' || r.status === 'sent') && new Date(r.scheduledFor) < now) {
          return true; // Past due = missed
        }
        return false;
      }).length;
      
      // Pending = future scheduled medications only
      const pendingReminders = reminders.filter(r => 
        (r.status === 'scheduled' || r.status === 'sent') && new Date(r.scheduledFor) >= now
      ).length;

      const overallAdherenceRate = totalReminders > 0 
        ? Math.round((takenReminders / totalReminders) * 100)
        : 0;

      // Group by date for daily adherence
      const dailyAdherence: any[] = [];
      const dateMap = new Map();

      for (let i = 0; i < daysBack; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayReminders = reminders.filter(r => {
          const reminderDate = new Date(r.scheduledFor).toISOString().split('T')[0];
          return reminderDate === dateStr;
        });

        const dayTaken = dayReminders.filter(r => 
          r.status === 'confirmed' || r.status === 'manual_confirm'
        ).length;
        const dayTotal = dayReminders.length;
        
        // Missed = explicitly missed OR past due and not taken
        const dayMissed = dayReminders.filter(r => {
          if (r.status === 'missed') return true;
          if ((r.status === 'scheduled' || r.status === 'sent') && new Date(r.scheduledFor) < now) {
            return true;
          }
          return false;
        }).length;
        
        const dayRate = dayTotal > 0 ? Math.round((dayTaken / dayTotal) * 100) : 0;

        dailyAdherence.push({
          date: dateStr,
          total: dayTotal,
          taken: dayTaken,
          missed: dayMissed,
          pending: dayTotal - dayTaken - dayMissed,
          adherenceRate: dayRate
        });
      }

      // Group by medication for medication-specific adherence
      const medicationMap = new Map();
      reminders.forEach(reminder => {
        const medId = reminder.prescription.medication.id;
        const medName = reminder.prescription.medication.name;
        
        if (!medicationMap.has(medId)) {
          medicationMap.set(medId, {
            id: medId,
            name: medName,
            total: 0,
            taken: 0,
            missed: 0,
            pending: 0
          });
        }
        
        const medStats = medicationMap.get(medId);
        medStats.total++;
        
        if (reminder.status === 'confirmed' || reminder.status === 'manual_confirm') {
          medStats.taken++;
        } else if (reminder.status === 'missed' || 
                   ((reminder.status === 'scheduled' || reminder.status === 'sent') && new Date(reminder.scheduledFor) < now)) {
          medStats.missed++; // Past due = missed
        } else {
          medStats.pending++;
        }
      });

      const medicationAdherence = Array.from(medicationMap.values()).map(med => ({
        ...med,
        adherenceRate: med.total > 0 ? Math.round((med.taken / med.total) * 100) : 0
      }));

      // Recent medication history (last 50 reminders) with computed status
      const recentHistory = reminders.slice(0, 50).map(reminder => {
        // Compute actual status (past due = missed)
        let displayStatus = reminder.status;
        if ((reminder.status === 'scheduled' || reminder.status === 'sent') && 
            new Date(reminder.scheduledFor) < now) {
          displayStatus = 'missed';
        }
        
        return {
          id: reminder.id,
          medicationName: reminder.prescription.medication.name,
          dosage: reminder.prescription.customDosage || reminder.prescription.medication.dosage,
          scheduledFor: reminder.scheduledFor.toISOString(),
          status: displayStatus, // Use computed status
          confirmedAt: reminder.confirmedAt?.toISOString() || null,
          snoozedUntil: reminder.snoozedUntil?.toISOString() || null
        };
      });

      // Calculate weekly adherence (last 4 weeks)
      const weeklyAdherence: any[] = [];
      for (let week = 0; week < 4; week++) {
        const weekEnd = new Date(endDate);
        weekEnd.setDate(endDate.getDate() - (week * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekEnd.getDate() - 6);

        const weekReminders = reminders.filter(r => {
          const reminderDate = new Date(r.scheduledFor);
          return reminderDate >= weekStart && reminderDate <= weekEnd;
        });

        const weekTaken = weekReminders.filter(r => 
          r.status === 'confirmed' || r.status === 'manual_confirm'
        ).length;
        const weekTotal = weekReminders.length;
        
        // Missed = explicitly missed OR past due and not taken
        const weekMissed = weekReminders.filter(r => {
          if (r.status === 'missed') return true;
          if ((r.status === 'scheduled' || r.status === 'sent') && new Date(r.scheduledFor) < now) {
            return true;
          }
          return false;
        }).length;
        
        const weekRate = weekTotal > 0 ? Math.round((weekTaken / weekTotal) * 100) : 0;

        weeklyAdherence.unshift({
          weekNumber: 4 - week,
          startDate: weekStart.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0],
          total: weekTotal,
          taken: weekTaken,
          missed: weekMissed,
          adherenceRate: weekRate
        });
      }

      return {
        overallStats: {
          totalReminders,
          takenReminders,
          missedReminders,
          pendingReminders,
          adherenceRate: overallAdherenceRate,
          period: `${daysBack} derniers jours`
        },
        dailyAdherence,
        weeklyAdherence,
        medicationAdherence,
        recentHistory
      };
    } catch (error) {
      console.error('Error getting patient adherence history:', error);
      throw new Error('Failed to get patient adherence history');
    }
  }

  /**
   * Get deleted prescriptions since last sync
   */
  async getDeletedPrescriptions(patientId: string, lastSyncTime: Date): Promise<string[]> {
    try {
      console.log('🔍 Checking for deleted prescriptions since:', lastSyncTime.toISOString());
      
      // Find prescriptions that were deleted after last sync
      // We need to check the prescription history or use a soft delete approach
      const deletedPrescriptions = await prisma.prescription.findMany({
        where: {
          patientId: patientId,
          deletedAt: {
            not: null,
            gte: lastSyncTime
          }
        },
        select: {
          id: true
        }
      });

      const deletedIds = deletedPrescriptions.map(p => p.id);
      console.log(`🗑️ Found ${deletedIds.length} deleted prescriptions:`, deletedIds);
      
      return deletedIds;
    } catch (error) {
      console.error('Error getting deleted prescriptions:', error);
      // Return empty array if there's an error - don't fail the sync
      return [];
    }
  }
}

export const patientService = new PatientService();
