import { PrismaClient } from '@prisma/client';
import * as admin from 'firebase-admin';
import path from 'path';
const prisma = new PrismaClient();
// Initialize Firebase Admin SDK
let firebaseInitialized = false;
try {
    if (admin && admin.apps && admin.apps.length === 0) {
        const serviceAccountPath = path.join(process.cwd(), 'medicare-244b3-firebase-adminsdk-fbsvc-21e2b2edf9.json');
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: 'medicare-244b3',
        });
        firebaseInitialized = true;
        console.log('🔥 Firebase Admin SDK initialized successfully');
    }
}
catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    console.log('⚠️ Falling back to Expo Push API');
}
export class PushNotificationService {
    expoApiUrl = 'https://exp.host/--/api/v2/push/send';
    /**
     * Send push notification via Firebase or Expo (with fallback)
     */
    async sendPushNotification(token, title, body, data) {
        // Try Firebase first if available
        if (firebaseInitialized && admin && admin.apps && admin.apps.length > 0) {
            return this.sendFirebaseNotification(token, title, body, data);
        }
        else {
            // Fallback to Expo Push API
            return this.sendExpoNotification(token, title, body, data);
        }
    }
    /**
     * Send push notification via Firebase Cloud Messaging
     */
    async sendFirebaseNotification(token, title, body, data) {
        try {
            console.log('🔥 Sending Firebase push notification to token:', token.substring(0, 20) + '...');
            const message = {
                token: token,
                notification: {
                    title: title,
                    body: body,
                },
                data: data ? Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)])) : {},
                android: {
                    notification: {
                        channelId: 'medication-reminders',
                        priority: 'high',
                        defaultSound: true,
                        defaultVibrateTimings: true,
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1,
                            alert: {
                                title: title,
                                body: body,
                            },
                        },
                    },
                },
            };
            const response = await admin.messaging().send(message);
            console.log('✅ Firebase push notification sent successfully:', response);
            return true;
        }
        catch (error) {
            console.error('❌ Error sending Firebase push notification:', error);
            // Fallback to Expo if Firebase fails
            console.log('🔄 Falling back to Expo Push API...');
            return this.sendExpoNotification(token, title, body, data);
        }
    }
    /**
     * Send push notification via Expo Push API
     */
    async sendExpoNotification(token, title, body, data) {
        try {
            console.log('📱 Sending Expo push notification to token:', token.substring(0, 20) + '...');
            const payload = {
                to: token,
                title: title,
                body: body,
                data: data || {},
                sound: 'default',
                priority: 'high',
                channelId: 'medication-reminders',
            };
            const response = await fetch(this.expoApiUrl, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            // Handle both array and object responses from Expo
            const isSuccess = response.ok && (
            // Array format: { data: [{ status: 'ok', id: '...' }] }
            (result.data && Array.isArray(result.data) && result.data[0]?.status === 'ok') ||
                // Object format: { data: { status: 'ok', id: '...' } }
                (result.data && !Array.isArray(result.data) && result.data.status === 'ok') ||
                // Direct format: { status: 'ok', id: '...' }
                (result.status === 'ok'));
            if (isSuccess) {
                console.log('✅ Expo push notification sent successfully');
                return true;
            }
            else {
                console.error('❌ Expo push notification failed:', result);
                return false;
            }
        }
        catch (error) {
            console.error('❌ Error sending Expo push notification:', error);
            return false;
        }
    }
    /**
     * Send medication reminder notification to patient
     */
    async sendMedicationReminder(patientId, reminderData) {
        try {
            // Get patient's push token
            const patient = await prisma.user.findUnique({
                where: { id: patientId },
                select: {
                    expoPushToken: true,
                    notificationsEnabled: true,
                    firstName: true,
                },
            });
            if (!patient || !patient.expoPushToken || !patient.notificationsEnabled) {
                console.log('❌ Patient push token not available or notifications disabled');
                return false;
            }
            const { medications, medicationName, dosage } = reminderData;
            let title;
            let body;
            if (medications && medications.length > 1) {
                // Multiple medications
                title = `💊 ${medications.length} Médicaments à prendre`;
                body = medications.map(med => `${med.name} (${med.dosage})`).join(', ');
            }
            else {
                // Single medication
                title = `💊 Temps de prendre ${medicationName}`;
                body = `Dosage: ${dosage}`;
            }
            const notificationData = {
                type: 'medication_reminder',
                reminderId: reminderData.reminderId,
                patientId: reminderData.patientId,
                medicationName: reminderData.medicationName,
                dosage: reminderData.dosage,
                reminderTime: reminderData.reminderTime,
            };
            const success = await this.sendPushNotification(patient.expoPushToken, title, body, notificationData);
            if (success) {
                // Update reminder status
                await prisma.medicationReminder.update({
                    where: { id: reminderData.reminderId },
                    data: {
                        pushNotificationSent: true,
                        sentAt: new Date(),
                    },
                });
            }
            return success;
        }
        catch (error) {
            console.error('❌ Error sending medication reminder:', error);
            return false;
        }
    }
    /**
     * Send alert to tutors when patient doesn't respond
     */
    async sendTutorAlert(patientId, reminderData) {
        try {
            // Get patient info
            const patient = await prisma.user.findUnique({
                where: { id: patientId },
                select: {
                    firstName: true,
                    lastName: true,
                },
            });
            if (!patient) {
                console.log('❌ Patient not found for tutor alert');
                return false;
            }
            // Get tutors for this patient
            const tutorRelationships = await prisma.userRelationship.findMany({
                where: {
                    patientId,
                    relationshipType: 'tuteur',
                    isActive: true,
                },
                include: {
                    caregiver: {
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
            if (tutorRelationships.length === 0) {
                console.log('❌ No tutors found for patient');
                return false;
            }
            let alertsSent = 0;
            for (const relationship of tutorRelationships) {
                const tutor = relationship.caregiver;
                if (!tutor.expoPushToken || !tutor.notificationsEnabled) {
                    console.log(`❌ Tutor ${tutor.firstName} has no push token or notifications disabled`);
                    continue;
                }
                const { medications, medicationName } = reminderData;
                let medicationText;
                if (medications && medications.length > 1) {
                    medicationText = `${medications.length} médicaments`;
                }
                else {
                    medicationText = medicationName;
                }
                const alertData = {
                    type: 'tutor_alert',
                    patientId,
                    patientName: `${patient.firstName} ${patient.lastName}`,
                    medicationName: medicationText,
                    reminderTime: reminderData.reminderTime,
                    reminderId: reminderData.reminderId,
                };
                const success = await this.sendPushNotification(tutor.expoPushToken, '⚠️ Médicament non pris', `${patient.firstName} ${patient.lastName} n'a pas confirmé la prise de ${medicationText}`, alertData);
                if (success) {
                    alertsSent++;
                }
            }
            if (alertsSent > 0) {
                // Update reminder with tutor alert info
                await prisma.medicationReminder.update({
                    where: { id: reminderData.reminderId },
                    data: {
                        tutorAlertSent: true,
                        tutorAlertAt: new Date(),
                    },
                });
                // Create alert records for tutors
                for (const relationship of tutorRelationships) {
                    await prisma.alert.create({
                        data: {
                            patientId,
                            tuteurId: relationship.caregiverId,
                            alertType: 'missed_medication',
                            title: 'Médicament non pris',
                            message: `${patient.firstName} ${patient.lastName} n'a pas confirmé la prise de médicament`,
                            isRead: false,
                            reminderId: reminderData.reminderId,
                        },
                    });
                }
            }
            console.log(`✅ Sent ${alertsSent} tutor alerts`);
            return alertsSent > 0;
        }
        catch (error) {
            console.error('❌ Error sending tutor alert:', error);
            return false;
        }
    }
    /**
     * Update user's push token
     */
    async updateUserPushToken(userId, pushToken) {
        try {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    expoPushToken: pushToken,
                },
            });
            console.log(`✅ Updated push token for user ${userId}`);
            return true;
        }
        catch (error) {
            console.error('❌ Error updating push token:', error);
            return false;
        }
    }
    /**
     * Enable/disable notifications for user
     */
    async updateNotificationSettings(userId, enabled) {
        try {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    notificationsEnabled: enabled,
                },
            });
            console.log(`✅ Updated notification settings for user ${userId}: ${enabled}`);
            return true;
        }
        catch (error) {
            console.error('❌ Error updating notification settings:', error);
            return false;
        }
    }
    /**
     * Send test notification
     */
    async sendTestNotification(userId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    expoPushToken: true,
                    firstName: true,
                },
            });
            if (!user || !user.expoPushToken) {
                console.log('❌ User push token not available');
                return false;
            }
            const testData = {
                type: 'test',
                timestamp: new Date().toISOString(),
            };
            return await this.sendPushNotification(user.expoPushToken, '🧪 Test Notification', `Bonjour ${user.firstName}! Ceci est une notification de test.`, testData);
        }
        catch (error) {
            console.error('❌ Error sending test notification:', error);
            return false;
        }
    }
}
export const pushNotificationService = new PushNotificationService();
