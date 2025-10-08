import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export class UserService {
    /**
     * Get user profile data for any user type
     */
    async getUserProfile(userId) {
        try {
            // Get user basic data
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phoneNumber: true,
                    userType: true,
                    isActive: true,
                    createdAt: true,
                    lastLogin: true,
                    notificationsEnabled: true,
                    expoPushToken: true,
                }
            });
            if (!user) {
                throw new Error('User not found');
            }
            // Get user settings for additional profile data
            const userSettings = await prisma.userSetting.findUnique({
                where: { userId },
                select: {
                    timezone: true,
                    language: true,
                    appSettings: true,
                    notificationPreferences: true,
                }
            });
            // Parse additional profile data from settings
            const profileData = userSettings?.appSettings || {};
            // Calculate statistics based on user type
            let statistics = {};
            switch (user.userType) {
                case 'patient':
                    statistics = await this.getPatientStatistics(userId);
                    break;
                case 'tuteur':
                    statistics = await this.getTutorStatistics(userId);
                    break;
                case 'medecin':
                    statistics = await this.getDoctorStatistics(userId);
                    break;
            }
            // Calculate last activity
            const lastActivity = await this.calculateLastActivity(userId, user.userType);
            return {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                phone: user.phoneNumber,
                userType: user.userType,
                isActive: user.isActive,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin || undefined,
                lastActivity,
                notificationsEnabled: user.notificationsEnabled,
                expoPushToken: user.expoPushToken || undefined,
                // From UserSetting
                timezone: userSettings?.timezone || undefined,
                language: userSettings?.language || undefined,
                // Extended fields in appSettings JSON
                appSettings: {
                    dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : undefined,
                    address: profileData.address,
                    emergencyContact: profileData.emergencyContact,
                    specialization: profileData.specialization,
                    licenseNumber: profileData.licenseNumber,
                    department: profileData.department,
                    bio: profileData.bio,
                    profilePicture: profileData.profilePicture,
                },
                // Keep old structure for backwards compatibility
                dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : undefined,
                address: profileData.address,
                emergencyContact: profileData.emergencyContact,
                specialization: profileData.specialization,
                licenseNumber: profileData.licenseNumber,
                department: profileData.department,
                bio: profileData.bio,
                profilePicture: profileData.profilePicture,
                ...statistics
            };
        }
        catch (error) {
            console.error('Error getting user profile:', error);
            throw new Error('Failed to get user profile');
        }
    }
    /**
     * Update user profile data for any user type
     */
    async updateUserProfile(userId, profileData) {
        try {
            // Validate that the user exists
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });
            if (!user) {
                throw new Error('User not found');
            }
            // Update basic user data
            const basicUpdates = {};
            if (profileData.firstName)
                basicUpdates.firstName = profileData.firstName;
            if (profileData.lastName)
                basicUpdates.lastName = profileData.lastName;
            if (profileData.phone)
                basicUpdates.phoneNumber = profileData.phone;
            if (profileData.phoneNumber)
                basicUpdates.phoneNumber = profileData.phoneNumber;
            if (profileData.notificationsEnabled !== undefined)
                basicUpdates.notificationsEnabled = profileData.notificationsEnabled;
            // Handle email update with uniqueness check
            if (profileData.email && profileData.email !== user.email) {
                // Check if email is already in use by another user
                const existingUser = await prisma.user.findUnique({
                    where: { email: profileData.email }
                });
                if (existingUser && existingUser.id !== userId) {
                    throw new Error('Cette adresse email est déjà utilisée');
                }
                basicUpdates.email = profileData.email;
            }
            if (Object.keys(basicUpdates).length > 0) {
                console.log('💾 Updating User table with:', basicUpdates);
                await prisma.user.update({
                    where: { id: userId },
                    data: basicUpdates
                });
                console.log('✅ User table updated');
            }
            // Update extended profile data in user settings
            const extendedData = {};
            if (profileData.dateOfBirth !== undefined)
                extendedData.dateOfBirth = profileData.dateOfBirth;
            if (profileData.address !== undefined)
                extendedData.address = profileData.address;
            if (profileData.emergencyContact !== undefined)
                extendedData.emergencyContact = profileData.emergencyContact;
            if (profileData.specialization !== undefined)
                extendedData.specialization = profileData.specialization;
            if (profileData.licenseNumber !== undefined)
                extendedData.licenseNumber = profileData.licenseNumber;
            if (profileData.department !== undefined)
                extendedData.department = profileData.department;
            if (profileData.bio !== undefined)
                extendedData.bio = profileData.bio;
            if (profileData.profilePicture !== undefined)
                extendedData.profilePicture = profileData.profilePicture;
            if (Object.keys(extendedData).length > 0) {
                // Get existing settings
                const existingSettings = await prisma.userSetting.findUnique({
                    where: { userId }
                });
                const currentAppSettings = existingSettings?.appSettings || {};
                const updatedAppSettings = { ...currentAppSettings, ...extendedData };
                // Upsert user settings
                await prisma.userSetting.upsert({
                    where: { userId },
                    update: {
                        appSettings: updatedAppSettings
                    },
                    create: {
                        userId,
                        appSettings: updatedAppSettings
                    }
                });
            }
        }
        catch (error) {
            console.error('Error updating user profile:', error);
            throw error; // Throw the original error to preserve the message
        }
    }
    /**
     * Get patient-specific statistics
     */
    async getPatientStatistics(patientId) {
        // Total medications count
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
        return {
            totalMedications,
            adherenceRate
        };
    }
    /**
     * Get tutor-specific statistics
     */
    async getTutorStatistics(tutorId) {
        // Total patients under care
        const totalPatients = await prisma.userRelationship.count({
            where: {
                caregiverId: tutorId,
                isActive: true
            }
        });
        return {
            totalPatients
        };
    }
    /**
     * Get doctor-specific statistics
     */
    async getDoctorStatistics(doctorId) {
        // Total patients
        const totalPatients = await prisma.prescription.groupBy({
            by: ['patientId'],
            where: {
                prescribedBy: doctorId,
                isActive: true
            }
        });
        // Total prescriptions
        const totalPrescriptions = await prisma.prescription.count({
            where: {
                prescribedBy: doctorId,
                isActive: true
            }
        });
        return {
            totalPatients: totalPatients.length,
            totalPrescriptions
        };
    }
    /**
     * Calculate last activity based on user type
     */
    async calculateLastActivity(userId, userType) {
        let lastActivityTime = null;
        switch (userType) {
            case 'patient':
                // Last medication reminder or alert
                const lastReminder = await prisma.medicationReminder.findFirst({
                    where: { patientId: userId },
                    orderBy: { createdAt: 'desc' }
                });
                const lastAlert = await prisma.alert.findFirst({
                    where: { patientId: userId },
                    orderBy: { createdAt: 'desc' }
                });
                const reminderTime = lastReminder?.createdAt || null;
                const alertTime = lastAlert?.createdAt || null;
                lastActivityTime = reminderTime && alertTime
                    ? (reminderTime > alertTime ? reminderTime : alertTime)
                    : (reminderTime || alertTime);
                break;
            case 'tuteur':
                // Last voice message or alert created
                const lastVoiceMessage = await prisma.voiceMessage.findFirst({
                    where: { creatorId: userId },
                    orderBy: { createdAt: 'desc' }
                });
                const lastTutorAlert = await prisma.alert.findFirst({
                    where: { tuteurId: userId },
                    orderBy: { createdAt: 'desc' }
                });
                const voiceTime = lastVoiceMessage?.createdAt || null;
                const tutorAlertTime = lastTutorAlert?.createdAt || null;
                lastActivityTime = voiceTime && tutorAlertTime
                    ? (voiceTime > tutorAlertTime ? voiceTime : tutorAlertTime)
                    : (voiceTime || tutorAlertTime);
                break;
            case 'medecin':
                // Last prescription created
                const lastPrescription = await prisma.prescription.findFirst({
                    where: { prescribedBy: userId },
                    orderBy: { createdAt: 'desc' }
                });
                lastActivityTime = lastPrescription?.createdAt || null;
                break;
        }
        if (!lastActivityTime) {
            return 'Aucune activité';
        }
        const diffInHours = (new Date().getTime() - lastActivityTime.getTime()) / (1000 * 60 * 60);
        if (diffInHours < 1) {
            return `Il y a ${Math.floor(diffInHours * 60)} min`;
        }
        else if (diffInHours < 24) {
            return `Il y a ${Math.floor(diffInHours)}h`;
        }
        else {
            return `Il y a ${Math.floor(diffInHours / 24)} jour(s)`;
        }
    }
}
export const userService = new UserService();
