import prisma from '../config/database.js';
import { ReminderStatus } from '@prisma/client';
export class ReminderGeneratorService {
    /**
     * Generate medication reminders for a specific date based on active schedules
     */
    async generateRemindersForDate(targetDate) {
        console.log(`🕒 Generating reminders for date: ${targetDate.toDateString()}`);
        try {
            // Get all active medication schedules
            const schedules = await prisma.medicationSchedule.findMany({
                where: {
                    isActive: true,
                    prescription: {
                        isActive: true,
                        // Check if prescription is still valid for the target date
                        startDate: {
                            lte: targetDate
                        },
                        OR: [
                            { endDate: null }, // No end date (chronic medication)
                            { endDate: { gte: targetDate } } // End date is after target date
                        ]
                    }
                },
                include: {
                    prescription: {
                        include: {
                            medication: true,
                            patient: true
                        }
                    }
                }
            });
            console.log(`📋 Found ${schedules.length} active schedules to process`);
            // Get the day of week for target date (1=Monday, 7=Sunday)
            const dayOfWeek = targetDate.getDay() === 0 ? 7 : targetDate.getDay();
            let remindersCreated = 0;
            for (const schedule of schedules) {
                // Check if this schedule applies to the target day
                if (!schedule.daysOfWeek.includes(dayOfWeek)) {
                    continue;
                }
                // Create the scheduled time for the target date
                const scheduledTime = new Date(targetDate);
                const scheduleTime = new Date(schedule.scheduledTime);
                scheduledTime.setHours(scheduleTime.getHours(), scheduleTime.getMinutes(), scheduleTime.getSeconds(), 0);
                console.log(`🔄 Generating reminder for ${schedule.prescription.medication.name}`);
                console.log(`   Schedule time from DB: ${schedule.scheduledTime}`);
                console.log(`   Target date: ${targetDate.toISOString()}`);
                console.log(`   Generated reminder time: ${scheduledTime.toISOString()}`);
                console.log(`   Local display: ${scheduledTime.toLocaleString()}`);
                // Check if a reminder already exists for this prescription and time
                const existingReminder = await prisma.medicationReminder.findFirst({
                    where: {
                        prescriptionId: schedule.prescriptionId,
                        patientId: schedule.prescription.patientId,
                        scheduledFor: scheduledTime
                    }
                });
                if (existingReminder) {
                    console.log(`⏭️  Reminder already exists for ${schedule.prescription.medication.name} at ${scheduledTime.toLocaleString()}`);
                    continue;
                }
                // Check for schedule exceptions
                const exception = await prisma.medicationScheduleException.findFirst({
                    where: {
                        scheduleId: schedule.id,
                        date: {
                            gte: new Date(targetDate.setHours(0, 0, 0, 0)),
                            lt: new Date(targetDate.setHours(23, 59, 59, 999))
                        }
                    }
                });
                if (exception) {
                    console.log(`🚫 Skipping reminder due to exception: ${exception.reason}`);
                    continue;
                }
                // Get prescription to check if it has a specific voice message assigned
                const prescription = await prisma.prescription.findUnique({
                    where: { id: schedule.prescriptionId },
                    select: { voiceMessageId: true }
                });
                // Use prescription's specific voice message, or fall back to patient's most recent voice
                let voiceMessageId = prescription?.voiceMessageId;
                if (!voiceMessageId) {
                    // Fallback: Find the most recent active voice message for this patient
                    const voiceMessage = await prisma.voiceMessage.findFirst({
                        where: {
                            patientId: schedule.prescription.patientId,
                            isActive: true
                        },
                        orderBy: {
                            createdAt: 'desc'
                        }
                    });
                    voiceMessageId = voiceMessage?.id || null;
                }
                // Create the medication reminder with voice message link
                const reminder = await prisma.medicationReminder.create({
                    data: {
                        prescriptionId: schedule.prescriptionId,
                        patientId: schedule.prescription.patientId,
                        scheduledFor: scheduledTime,
                        status: ReminderStatus.scheduled,
                        voiceMessageId: voiceMessageId
                    }
                });
                console.log(`✅ Created reminder for ${schedule.prescription.patient.firstName} - ${schedule.prescription.medication.name} at ${scheduledTime.toLocaleString()}${voiceMessageId ? ' (with voice message)' : ''}`);
                remindersCreated++;
            }
            console.log(`🎉 Generated ${remindersCreated} new reminders for ${targetDate.toDateString()}`);
        }
        catch (error) {
            console.error('❌ Error generating reminders:', error);
            throw error;
        }
    }
    /**
     * Generate reminders for today
     */
    async generateTodaysReminders() {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of day
        await this.generateRemindersForDate(today);
    }
    /**
     * Generate reminders for the next N days
     */
    async generateRemindersForNextDays(days = 7) {
        console.log(`📅 Generating reminders for the next ${days} days`);
        for (let i = 0; i < days; i++) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + i);
            targetDate.setHours(0, 0, 0, 0);
            await this.generateRemindersForDate(targetDate);
        }
    }
    /**
     * Clean up old reminders (older than 30 days and not confirmed)
     */
    async cleanupOldReminders() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const deletedCount = await prisma.medicationReminder.deleteMany({
            where: {
                scheduledFor: {
                    lt: thirtyDaysAgo
                },
                status: {
                    in: [ReminderStatus.scheduled, ReminderStatus.sent]
                }
            }
        });
        console.log(`🧹 Cleaned up ${deletedCount.count} old reminders`);
    }
    /**
     * Update the lastGeneratedAt field for processed schedules
     */
    async updateLastGeneratedAt(scheduleIds) {
        if (scheduleIds.length === 0)
            return;
        await prisma.medicationSchedule.updateMany({
            where: {
                id: {
                    in: scheduleIds
                }
            },
            data: {
                lastGeneratedAt: new Date()
            }
        });
    }
    /**
     * Link existing reminders to voice messages (migration/repair utility)
     */
    async linkExistingRemindersToVoiceMessages() {
        console.log('🔗 Linking existing reminders to voice messages...');
        try {
            // Get all reminders without voice messages
            const reminders = await prisma.medicationReminder.findMany({
                where: {
                    voiceMessageId: null,
                    status: { in: ['scheduled', 'sent'] }
                },
                select: {
                    id: true,
                    patientId: true
                }
            });
            console.log(`📋 Found ${reminders.length} reminders without voice messages`);
            let linkedCount = 0;
            for (const reminder of reminders) {
                // Find the most recent active voice message for this patient
                const voiceMessage = await prisma.voiceMessage.findFirst({
                    where: {
                        patientId: reminder.patientId,
                        isActive: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                });
                if (voiceMessage) {
                    await prisma.medicationReminder.update({
                        where: { id: reminder.id },
                        data: { voiceMessageId: voiceMessage.id }
                    });
                    linkedCount++;
                }
            }
            console.log(`✅ Linked ${linkedCount} reminders to voice messages`);
        }
        catch (error) {
            console.error('❌ Error linking reminders to voice messages:', error);
            throw error;
        }
    }
}
export const reminderGeneratorService = new ReminderGeneratorService();
