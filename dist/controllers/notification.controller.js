import { pushNotificationService } from '../services/pushNotification.service.js';
import { notificationScheduler } from '../services/notificationScheduler.service.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export class NotificationController {
    /**
     * Register device push token
     */
    async registerPushToken(req, res) {
        try {
            const { pushToken } = req.body;
            const userId = req.user.userId;
            if (!pushToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Push token is required',
                });
            }
            const success = await pushNotificationService.updateUserPushToken(userId, pushToken);
            if (success) {
                res.json({
                    success: true,
                    message: 'Push token registered successfully',
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    message: 'Failed to register push token',
                });
            }
        }
        catch (error) {
            console.error('Error registering push token:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Failed to register push token',
            });
        }
    }
    /**
     * Update notification settings
     */
    async updateNotificationSettings(req, res) {
        try {
            const { enabled } = req.body;
            const userId = req.user.userId;
            if (typeof enabled !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    message: 'Enabled must be a boolean value',
                });
            }
            const success = await pushNotificationService.updateNotificationSettings(userId, enabled);
            if (success) {
                res.json({
                    success: true,
                    message: `Notifications ${enabled ? 'enabled' : 'disabled'} successfully`,
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    message: 'Failed to update notification settings',
                });
            }
        }
        catch (error) {
            console.error('Error updating notification settings:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Failed to update notification settings',
            });
        }
    }
    /**
     * Confirm medication taken
     */
    async confirmMedicationTaken(req, res) {
        try {
            const { reminderIds } = req.body;
            const userId = req.user.userId;
            if (!reminderIds || !Array.isArray(reminderIds) || reminderIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Reminder IDs are required',
                });
            }
            // Update reminder status to confirmed
            const updateResult = await prisma.medicationReminder.updateMany({
                where: {
                    id: { in: reminderIds },
                    patientId: userId,
                    status: { in: ['scheduled', 'sent'] }, // Allow both scheduled and sent
                },
                data: {
                    status: 'confirmed',
                    confirmedAt: new Date(),
                    confirmedBy: userId,
                },
            });
            if (updateResult.count === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No valid reminders found to confirm',
                });
            }
            // Create confirmation records
            for (const reminderId of reminderIds) {
                await prisma.medicationConfirmation.create({
                    data: {
                        reminderId,
                        confirmedBy: userId,
                        confirmationType: 'patient',
                        confirmedAt: new Date(),
                    },
                });
            }
            res.json({
                success: true,
                message: `${updateResult.count} medication(s) confirmed successfully`,
                data: {
                    confirmedCount: updateResult.count,
                    confirmedAt: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            console.error('Error confirming medication:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Failed to confirm medication',
            });
        }
    }
    /**
     * Snooze medication reminder (remind in 10 minutes)
     */
    async snoozeMedicationReminder(req, res) {
        try {
            const { reminderIds } = req.body;
            const userId = req.user.userId;
            if (!reminderIds || !Array.isArray(reminderIds) || reminderIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Reminder IDs are required',
                });
            }
            const snoozeUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
            // Update reminder to snoozed
            const updateResult = await prisma.medicationReminder.updateMany({
                where: {
                    id: { in: reminderIds },
                    patientId: userId,
                    status: { in: ['scheduled', 'sent'] }, // Allow both scheduled and sent
                },
                data: {
                    snoozedUntil: snoozeUntil,
                    scheduledFor: snoozeUntil, // Reschedule for 10 minutes later
                },
            });
            if (updateResult.count === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No valid reminders found to snooze',
                });
            }
            res.json({
                success: true,
                message: `${updateResult.count} medication reminder(s) snoozed for 10 minutes`,
                data: {
                    snoozedCount: updateResult.count,
                    snoozeUntil: snoozeUntil.toISOString(),
                },
            });
        }
        catch (error) {
            console.error('Error snoozing medication reminder:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Failed to snooze medication reminder',
            });
        }
    }
    /**
     * Send test notification
     */
    async sendTestNotification(req, res) {
        try {
            const userId = req.user.userId;
            const success = await pushNotificationService.sendTestNotification(userId);
            if (success) {
                res.json({
                    success: true,
                    message: 'Test notification sent successfully',
                });
            }
            else {
                res.status(500).json({
                    success: false,
                    message: 'Failed to send test notification',
                });
            }
        }
        catch (error) {
            console.error('Error sending test notification:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Failed to send test notification',
            });
        }
    }
    /**
     * Create test medication reminder (for development)
     */
    async createTestReminder(req, res) {
        try {
            const userId = req.user.userId;
            const { delaySeconds = 10 } = req.body;
            const reminderId = await notificationScheduler.createTestReminder(userId, delaySeconds);
            res.json({
                success: true,
                message: `Test reminder created for ${delaySeconds} seconds from now`,
                data: {
                    reminderId,
                    scheduledFor: new Date(Date.now() + delaySeconds * 1000).toISOString(),
                },
            });
        }
        catch (error) {
            console.error('Error creating test reminder:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Failed to create test reminder',
            });
        }
    }
    /**
     * Get notification history for user
     */
    async getNotificationHistory(req, res) {
        try {
            const userId = req.user.userId;
            const limit = parseInt(req.query.limit) || 50;
            const reminders = await prisma.medicationReminder.findMany({
                where: {
                    patientId: userId,
                    pushNotificationSent: true,
                },
                include: {
                    prescription: {
                        include: {
                            medication: true,
                        },
                    },
                },
                orderBy: {
                    scheduledFor: 'desc',
                },
                take: limit,
            });
            const history = reminders.map(reminder => ({
                id: reminder.id,
                medicationName: reminder.prescription.medication.name,
                dosage: reminder.prescription.customDosage || reminder.prescription.medication.dosage,
                scheduledFor: reminder.scheduledFor,
                status: reminder.status,
                confirmedAt: reminder.confirmedAt,
                snoozedUntil: reminder.snoozedUntil,
                tutorAlertSent: reminder.tutorAlertSent,
                tutorAlertAt: reminder.tutorAlertAt,
            }));
            res.json({
                success: true,
                data: history,
                message: `Found ${history.length} notification records`,
            });
        }
        catch (error) {
            console.error('Error getting notification history:', error);
            res.status(500).json({
                success: false,
                message: error?.message || 'Failed to get notification history',
            });
        }
    }
}
export const notificationController = new NotificationController();
