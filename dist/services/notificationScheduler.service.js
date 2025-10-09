import { PrismaClient } from '@prisma/client';
import { pushNotificationService } from './pushNotification.service.js';
import { smsService } from './sms.service.js';
const prisma = new PrismaClient();
export class NotificationSchedulerService {
    isRunning = false;
    checkInterval = null;
    tutorAlertInterval = null;
    /**
     * Start the notification scheduler
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ Notification scheduler is already running');
            return;
        }
        console.log('🚀 Starting notification scheduler...');
        this.isRunning = true;
        // Check for due medication reminders every minute
        this.checkInterval = setInterval(() => {
            this.checkDueMedicationReminders();
        }, 60000); // 1 minute
        // Check for tutor alerts every 30 seconds
        this.tutorAlertInterval = setInterval(() => {
            this.checkTutorAlerts();
        }, 30000); // 30 seconds
        // Also run immediately
        this.checkDueMedicationReminders();
        this.checkTutorAlerts();
        console.log('✅ Notification scheduler started');
    }
    /**
     * Stop the notification scheduler
     */
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ Notification scheduler is not running');
            return;
        }
        console.log('🛑 Stopping notification scheduler...');
        this.isRunning = false;
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        if (this.tutorAlertInterval) {
            clearInterval(this.tutorAlertInterval);
            this.tutorAlertInterval = null;
        }
        console.log('✅ Notification scheduler stopped');
    }
    /**
     * Check for medication reminders that are due now
     */
    async checkDueMedicationReminders() {
        try {
            // Check reminders in UTC time (database stores UTC)
            const now = new Date();
            const oneMinuteAgo = new Date(now.getTime() - 60000); // 1 minute tolerance
            console.log(`🕐 Checking reminders - UTC time: ${now.toISOString()}`);
            // Find reminders that are due and haven't been sent yet
            const dueReminders = await prisma.medicationReminder.findMany({
                where: {
                    scheduledFor: {
                        gte: oneMinuteAgo,
                        lte: now,
                    },
                    status: 'scheduled',
                    pushNotificationSent: false,
                },
                include: {
                    prescription: {
                        include: {
                            medication: true,
                        },
                    },
                    patient: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            expoPushToken: true,
                            notificationsEnabled: true,
                        },
                    },
                },
            });
            if (dueReminders.length === 0) {
                return;
            }
            console.log(`📅 Found ${dueReminders.length} due medication reminders`);
            // Group reminders by patient and time (for multiple medications at same time)
            const groupedReminders = this.groupRemindersByPatientAndTime(dueReminders);
            for (const group of groupedReminders) {
                await this.sendGroupedMedicationReminder(group);
            }
        }
        catch (error) {
            console.error('❌ Error checking due medication reminders:', error);
        }
    }
    /**
     * Check for tutor alerts (5 minutes after notification sent without response)
     */
    async checkTutorAlerts() {
        try {
            // Calculate 5 minutes ago in UTC time
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
            // Find reminders that were sent 5+ minutes ago but not confirmed and no tutor alert sent
            const overdueReminders = await prisma.medicationReminder.findMany({
                where: {
                    pushNotificationSent: true,
                    sentAt: {
                        lte: fiveMinutesAgo,
                    },
                    status: 'scheduled', // Still not confirmed
                    tutorAlertSent: false,
                },
                include: {
                    prescription: {
                        include: {
                            medication: true,
                        },
                    },
                    patient: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            });
            if (overdueReminders.length === 0) {
                return;
            }
            console.log(`⚠️ Found ${overdueReminders.length} overdue medication reminders for tutor alerts`);
            for (const reminder of overdueReminders) {
                await this.sendTutorAlertForReminder(reminder);
            }
        }
        catch (error) {
            console.error('❌ Error checking tutor alerts:', error);
        }
    }
    /**
     * Group reminders by patient and time (within 5 minutes)
     */
    groupRemindersByPatientAndTime(reminders) {
        const groups = [];
        const processed = new Set();
        for (const reminder of reminders) {
            if (processed.has(reminder.id)) {
                continue;
            }
            const group = [reminder];
            processed.add(reminder.id);
            // Find other reminders for the same patient within 5 minutes
            for (const otherReminder of reminders) {
                if (otherReminder.id !== reminder.id &&
                    !processed.has(otherReminder.id) &&
                    otherReminder.patientId === reminder.patientId) {
                    const timeDiff = Math.abs(new Date(otherReminder.scheduledFor).getTime() -
                        new Date(reminder.scheduledFor).getTime());
                    // Group if within 5 minutes
                    if (timeDiff <= 5 * 60 * 1000) {
                        group.push(otherReminder);
                        processed.add(otherReminder.id);
                    }
                }
            }
            groups.push(group);
        }
        return groups;
    }
    /**
     * Send notification for a group of medication reminders
     */
    async sendGroupedMedicationReminder(reminderGroup) {
        try {
            const firstReminder = reminderGroup[0];
            // Get patient with phone number
            const patient = await prisma.user.findUnique({
                where: { id: firstReminder.patientId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                    expoPushToken: true,
                    notificationsEnabled: true,
                },
            });
            if (!patient) {
                console.log(`❌ Patient not found`);
                return;
            }
            let medications;
            let reminderData;
            const reminderIds = [];
            if (reminderGroup.length === 1) {
                // Single medication
                const reminder = reminderGroup[0];
                reminderIds.push(reminder.id);
                reminderData = {
                    reminderId: reminder.id,
                    medicationName: reminder.prescription.medication.name,
                    dosage: reminder.prescription.customDosage || reminder.prescription.medication.dosage || 'Dosage non spécifié',
                    instructions: reminder.prescription.instructions || reminder.prescription.medication.description,
                    imageUrl: reminder.prescription.medication.imageUrl,
                    patientId: reminder.patientId,
                    reminderTime: reminder.scheduledFor.toISOString(),
                };
            }
            else {
                // Multiple medications
                medications = reminderGroup.map(reminder => {
                    reminderIds.push(reminder.id);
                    return {
                        id: reminder.id,
                        name: reminder.prescription.medication.name,
                        dosage: reminder.prescription.customDosage || reminder.prescription.medication.dosage || 'Dosage non spécifié',
                        instructions: reminder.prescription.instructions || reminder.prescription.medication.description,
                        imageUrl: reminder.prescription.medication.imageUrl,
                    };
                });
                reminderData = {
                    reminderId: reminderGroup.map(r => r.id).join(','), // Multiple IDs
                    medicationName: `${medications.length} médicaments`,
                    dosage: 'Voir détails',
                    patientId: firstReminder.patientId,
                    reminderTime: firstReminder.scheduledFor.toISOString(),
                    medications,
                };
            }
            // 📱 SEND PUSH NOTIFICATION
            let pushSuccess = false;
            if (patient.expoPushToken && patient.notificationsEnabled) {
                pushSuccess = await pushNotificationService.sendMedicationReminder(patient.id, reminderData);
                // Log push notification delivery
                for (const reminderId of reminderIds) {
                    await prisma.reminderDeliveryLog.create({
                        data: {
                            reminderId,
                            channel: 'push',
                            provider: 'expo',
                            status: pushSuccess ? 'sent' : 'failed',
                            error: pushSuccess ? null : 'Push notification failed',
                        },
                    });
                }
                if (pushSuccess) {
                    console.log(`✅ Push notification sent to ${patient.firstName} ${patient.lastName}`);
                }
                else {
                    console.log(`❌ Push notification failed for ${patient.firstName} ${patient.lastName}`);
                }
            }
            else {
                console.log(`⚠️ Patient ${patient.firstName} has no push token or notifications disabled`);
            }
            // 📨 SEND SMS MESSAGE
            if (patient.phoneNumber) {
                const smsMessage = this.formatMedicationSMS(reminderGroup, patient.firstName);
                console.log(`📨 Sending SMS to ${patient.phoneNumber}`);
                const smsResult = await smsService.sendSMS(patient.phoneNumber, smsMessage);
                // Log SMS delivery
                for (const reminderId of reminderIds) {
                    await prisma.reminderDeliveryLog.create({
                        data: {
                            reminderId,
                            channel: 'sms',
                            provider: 'educanet',
                            providerId: smsResult.messageId,
                            status: smsResult.success ? 'sent' : 'failed',
                            error: smsResult.success ? null : smsResult.error,
                        },
                    });
                }
                if (smsResult.success) {
                    console.log(`✅ SMS sent to ${patient.firstName} ${patient.lastName}`);
                }
                else {
                    console.log(`❌ SMS failed for ${patient.firstName} ${patient.lastName}: ${smsResult.error}`);
                }
            }
            else {
                console.log(`⚠️ Patient ${patient.firstName} has no phone number`);
            }
            // Mark as sent if at least one channel succeeded
            if (pushSuccess || (patient.phoneNumber && reminderIds.length > 0)) {
                console.log(`✅ Medication reminder delivered to ${patient.firstName} ${patient.lastName}`);
            }
        }
        catch (error) {
            console.error('❌ Error sending grouped medication reminder:', error);
        }
    }
    /**
     * Format SMS message for medication reminders
     */
    formatMedicationSMS(reminderGroup, patientFirstName) {
        if (reminderGroup.length === 1) {
            // Single medication
            const reminder = reminderGroup[0];
            const medName = reminder.prescription.medication.name;
            const dosage = reminder.prescription.customDosage || reminder.prescription.medication.dosage || '';
            const instructions = reminder.prescription.instructions || '';
            let message = `MediCare: Bonjour ${patientFirstName}, il est temps de prendre ${medName}`;
            if (dosage) {
                message += ` (${dosage})`;
            }
            if (instructions) {
                message += `. ${instructions}`;
            }
            message += '.';
            return message;
        }
        else {
            // Multiple medications
            let message = `MediCare: Bonjour ${patientFirstName}, il est temps de prendre vos medicaments: `;
            const medList = reminderGroup.map(reminder => {
                const medName = reminder.prescription.medication.name;
                const dosage = reminder.prescription.customDosage || reminder.prescription.medication.dosage || '';
                return dosage ? `${medName} (${dosage})` : medName;
            });
            message += medList.join(', ') + '.';
            return message;
        }
    }
    /**
     * Send tutor alert for overdue reminder
     */
    async sendTutorAlertForReminder(reminder) {
        try {
            const reminderData = {
                reminderId: reminder.id,
                medicationName: reminder.prescription.medication.name,
                dosage: reminder.prescription.customDosage || reminder.prescription.medication.dosage || 'Dosage non spécifié',
                patientId: reminder.patientId,
                reminderTime: reminder.scheduledFor.toISOString(),
            };
            const success = await pushNotificationService.sendTutorAlert(reminder.patientId, reminderData);
            if (success) {
                console.log(`✅ Sent tutor alert for patient ${reminder.patient.firstName} ${reminder.patient.lastName}`);
            }
            else {
                console.log(`❌ Failed to send tutor alert for patient ${reminder.patient.firstName} ${reminder.patient.lastName}`);
            }
        }
        catch (error) {
            console.error('❌ Error sending tutor alert:', error);
        }
    }
    /**
     * Create test reminder for immediate testing
     */
    async createTestReminder(patientId, delaySeconds = 10) {
        try {
            // Get patient's first active prescription for testing
            const prescription = await prisma.prescription.findFirst({
                where: {
                    patientId,
                    isActive: true,
                },
                include: {
                    medication: true,
                },
            });
            if (!prescription) {
                throw new Error('No active prescription found for patient');
            }
            // Create reminder in UTC time (database stores UTC)
            const scheduledFor = new Date(Date.now() + delaySeconds * 1000);
            console.log(`🧪 Creating test reminder for UTC time: ${scheduledFor.toISOString()}`);
            const reminder = await prisma.medicationReminder.create({
                data: {
                    prescriptionId: prescription.id,
                    patientId,
                    scheduledFor,
                    status: 'scheduled',
                },
            });
            console.log(`🧪 Created test reminder ${reminder.id} for ${delaySeconds} seconds from now`);
            return reminder.id;
        }
        catch (error) {
            console.error('❌ Error creating test reminder:', error);
            throw error;
        }
    }
}
export const notificationScheduler = new NotificationSchedulerService();
