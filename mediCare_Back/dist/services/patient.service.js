import prisma from '../config/database.js';
export class PatientService {
    /**
     * Get overdue medications for a patient
     */
    async getOverdueMedications(patientId) {
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
        }
        catch (error) {
            console.error('Error getting overdue medications:', error);
            throw new Error('Failed to get overdue medications');
        }
    }
    /**
     * Get next upcoming medications for a patient
     */
    async getNextMedications(patientId, limit = 5) {
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
        }
        catch (error) {
            console.error('Error getting next medications:', error);
            throw new Error('Failed to get next medications');
        }
    }
    /**
     * Get latest messages from tutors for a patient
     */
    async getTutorMessages(patientId, limit = 10) {
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
        }
        catch (error) {
            console.error('Error getting tutor messages:', error);
            throw new Error('Failed to get tutor messages');
        }
    }
    /**
     * Get complete dashboard data for a patient
     */
    async getDashboardData(patientId) {
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
            const takenToday = todaysReminders.filter(r => r.status === 'confirmed' || r.status === 'manual_confirm').length;
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
        }
        catch (error) {
            console.error('Error getting patient dashboard data:', error);
            throw new Error('Failed to get patient dashboard data');
        }
    }
    /**
     * Mark a medication as taken
     */
    async markMedicationTaken(patientId, reminderId) {
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
        }
        catch (error) {
            console.error('Error marking medication as taken:', error);
            throw new Error('Failed to mark medication as taken');
        }
    }
    /**
     * Mark a tutor message as read
     */
    async markMessageRead(patientId, messageId) {
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
        }
        catch (error) {
            console.error('Error marking message as read:', error);
            throw new Error('Failed to mark message as read');
        }
    }
    /**
     * Get all medications for a patient with detailed information
     */
    async getPatientMedications(patientId) {
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
            const medicationsWithAdherence = await Promise.all(prescriptions.map(async (prescription) => {
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
                    schedules: prescription.schedules.map((schedule) => ({
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
            }));
            return medicationsWithAdherence;
        }
        catch (error) {
            console.error('Error getting patient medications:', error);
            throw new Error('Failed to get patient medications');
        }
    }
    /**
     * Get all messages for a patient from doctors and tutors
     */
    async getPatientMessages(patientId, limit = 50) {
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
            const allMessages = [];
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
        }
        catch (error) {
            console.error('Error getting patient messages:', error);
            throw new Error('Failed to get patient messages');
        }
    }
    /**
     * Get patient profile data
     */
    async getPatientProfile(patientId) {
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
                    }
                    else if (diffInHours < 24) {
                        lastActivity = `Il y a ${Math.floor(diffInHours)}h`;
                    }
                    else {
                        lastActivity = `Il y a ${Math.floor(diffInHours / 24)} jour(s)`;
                    }
                }
            }
            // TODO: Add medical conditions and allergies when those tables are implemented
            const medicalConditions = [];
            const allergies = [];
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
        }
        catch (error) {
            console.error('Error getting patient profile:', error);
            throw new Error('Failed to get patient profile');
        }
    }
    /**
     * Update patient profile data
     */
    async updatePatientProfile(patientId, profileData) {
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
        }
        catch (error) {
            console.error('Error updating patient profile:', error);
            throw new Error('Failed to update patient profile');
        }
    }
    /**
     * Get medications for a specific date for a patient
     */
    async getMedicationsByDate(patientId, dateStr) {
        try {
            // Parse the date string (format: YYYY-MM-DD)
            const targetDate = new Date(dateStr);
            const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
            console.log('🔍 Fetching medications for patient:', patientId);
            console.log('📅 Date range:', startOfDay, 'to', endOfDay);
            // Get all medication reminders for this date
            const reminders = await prisma.medicationReminder.findMany({
                where: {
                    patientId: patientId,
                    scheduledFor: {
                        gte: startOfDay,
                        lte: endOfDay
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
                let frontendStatus = 'pending';
                if (reminder.status === 'confirmed' || reminder.status === 'manual_confirm') {
                    frontendStatus = 'taken';
                }
                else if (reminder.status === 'missed') {
                    frontendStatus = 'missed';
                }
                else if (reminder.status === 'sent') {
                    frontendStatus = 'pending';
                }
                else if (reminder.status === 'scheduled') {
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
            const taken = reminders.filter(r => r.status === 'confirmed' || r.status === 'manual_confirm').length;
            const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;
            return {
                medications,
                total,
                taken,
                adherenceRate
            };
        }
        catch (error) {
            console.error('Error getting medications by date:', error);
            throw new Error('Failed to get medications for date');
        }
    }
}
export const patientService = new PatientService();
