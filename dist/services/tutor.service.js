import { PrismaClient } from '@prisma/client';
import { smsService } from './sms.service.js';
import { reminderGeneratorService } from './reminder-generator.service.js';
import bcrypt from 'bcryptjs';
import { normalizePhoneNumber } from '../utils/phoneNormalizer.js';
const prisma = new PrismaClient();
class TutorService {
    /**
     * Get 3 patients with the nearest medication times for a tutor
     */
    async getPatientsWithNearestMedications(tutorId) {
        try {
            // Get current time
            const now = new Date();
            // Find all patients under this tutor or doctor (both relationship types)
            const patients = await prisma.userRelationship.findMany({
                where: {
                    caregiverId: tutorId,
                    relationshipType: { in: ['tuteur', 'medecin'] }, // Support both tuteur and medecin
                    isActive: true,
                    patient: {
                        isActive: true
                    }
                },
                include: {
                    patient: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phoneNumber: true
                        }
                    }
                }
            });
            if (patients.length === 0) {
                return [];
            }
            const patientIds = patients.map(p => p.patient.id);
            // Get upcoming medication reminders for these patients
            const upcomingReminders = await prisma.medicationReminder.findMany({
                where: {
                    patientId: {
                        in: patientIds
                    },
                    scheduledFor: {
                        gte: now // Only future reminders
                    },
                    status: {
                        in: ['scheduled', 'sent'] // Only pending reminders
                    }
                },
                include: {
                    prescription: {
                        include: {
                            medication: true
                        }
                    },
                    patient: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phoneNumber: true
                        }
                    }
                },
                orderBy: {
                    scheduledFor: 'asc'
                }
            });
            // Group reminders by patient and get the nearest one for each
            const patientNearestReminders = new Map();
            for (const reminder of upcomingReminders) {
                const patientId = reminder.patientId;
                if (!patientNearestReminders.has(patientId)) {
                    patientNearestReminders.set(patientId, reminder);
                }
            }
            // Convert to the required format and calculate time until medication
            const result = Array.from(patientNearestReminders.values())
                .map(reminder => {
                const timeUntilMedication = Math.floor((reminder.scheduledFor.getTime() - now.getTime()) / (1000 * 60)); // minutes
                return {
                    patientId: reminder.patient.id,
                    patientName: `${reminder.patient.firstName} ${reminder.patient.lastName}`,
                    patientPhone: reminder.patient.phoneNumber,
                    nextMedicationTime: reminder.scheduledFor,
                    medicationName: reminder.prescription.medication.name,
                    prescriptionId: reminder.prescriptionId,
                    reminderId: reminder.id,
                    timeUntilMedication
                };
            })
                .sort((a, b) => a.timeUntilMedication - b.timeUntilMedication) // Sort by nearest time
                .slice(0, 3); // Get only top 3
            return result;
        }
        catch (error) {
            console.error('Error getting patients with nearest medications:', error);
            throw new Error('Failed to get patients with nearest medications');
        }
    }
    /**
     * Get alerts for missed medications and count of messages sent
     */
    async getMedicationAlerts(tutorId) {
        try {
            // Get all patients under this tutor
            const patients = await prisma.userRelationship.findMany({
                where: {
                    caregiverId: tutorId,
                    relationshipType: 'tuteur',
                    isActive: true
                },
                select: {
                    patientId: true
                }
            });
            if (patients.length === 0) {
                return {
                    missedMedications: [],
                    totalMessagesSent: 0
                };
            }
            const patientIds = patients.map(p => p.patientId);
            // Get missed medication alerts
            const missedMedications = await prisma.alert.findMany({
                where: {
                    tuteurId: tutorId,
                    patientId: {
                        in: patientIds
                    },
                    alertType: 'missed_medication',
                    isRead: false
                },
                include: {
                    patient: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phoneNumber: true
                        }
                    },
                    reminder: {
                        include: {
                            prescription: {
                                include: {
                                    medication: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            // Count total messages sent (reminders with status 'sent')
            const totalMessagesSent = await prisma.medicationReminder.count({
                where: {
                    patientId: {
                        in: patientIds
                    },
                    status: 'sent'
                }
            });
            // Get voice message count for this tutor
            const voiceMessageCount = await prisma.voiceMessage.count({
                where: {
                    isActive: true,
                    OR: [
                        { creatorId: tutorId }, // messages created by tutor
                        { patientId: { in: patientIds } } // messages tied to tutor's patients
                    ]
                }
            });
            return {
                missedMedications,
                totalMessagesSent,
                voiceMessageCount
            };
        }
        catch (error) {
            console.error('Error getting medication alerts:', error);
            throw new Error('Failed to get medication alerts');
        }
    }
    /**
     * Send SMS invitation to new patient
     */
    async sendPatientInvitation(tutorId, patientData) {
        try {
            console.log('═══════════════════════════════════════════════════');
            console.log('🏥 BACKEND: SEND PATIENT INVITATION');
            console.log('═══════════════════════════════════════════════════');
            console.log('👨‍⚕️ Doctor/Tutor ID:', tutorId);
            console.log('📝 Patient data received:', JSON.stringify(patientData, null, 2));
            console.log('🎤 Has audio message:', !!patientData.audioMessage);
            console.log('⏱️ Audio duration:', patientData.audioDuration, 'seconds');
            console.log('───────────────────────────────────────────────────');
            console.log('📤 STEP 1: FETCHING DOCTOR/TUTOR INFO');
            console.log('───────────────────────────────────────────────────');
            // Get tutor information
            const tutor = await prisma.user.findUnique({
                where: { id: tutorId },
                select: { firstName: true, lastName: true, email: true }
            });
            if (!tutor) {
                console.error('❌ Tutor not found:', tutorId);
                throw new Error('Tutor not found');
            }
            console.log('✅ Doctor/Tutor found:', tutor);
            console.log('───────────────────────────────────────────────────');
            console.log('📤 STEP 2: CHECKING FOR EXISTING PATIENT');
            console.log('───────────────────────────────────────────────────');
            // Normalize phone number for searching
            const phoneResult = normalizePhoneNumber(patientData.phoneNumber);
            console.log('📱 Phone (input):', patientData.phoneNumber);
            console.log('📱 Phone (normalized):', phoneResult.normalized);
            console.log('🔍 Searching with formats:', phoneResult.formats);
            if (!phoneResult.isValid) {
                throw new Error('Format de numéro de téléphone invalide');
            }
            // Check if a patient already exists with the same phone number
            const existingPatient = await prisma.user.findFirst({
                where: {
                    userType: 'patient',
                    OR: phoneResult.formats.map(phone => ({ phoneNumber: phone }))
                }
            });
            console.log('🔍 Existing patient found:', !!existingPatient);
            if (existingPatient) {
                console.log('👤 Existing patient ID:', existingPatient.id);
                console.log('📧 Existing patient email:', existingPatient.email);
                console.log('📱 Existing patient phone:', existingPatient.phoneNumber);
            }
            // Prepare variables for SMS content
            let patient = existingPatient || null;
            let generatedEmail = null;
            let generatedPassword = null;
            if (!patient) {
                console.log('───────────────────────────────────────────────────');
                console.log('📤 STEP 2a: CREATING NEW PATIENT');
                console.log('───────────────────────────────────────────────────');
                // Generate simple, user-friendly credentials
                const onlyDigits = (patientData.phoneNumber || '').replace(/\D/g, '');
                // Create simple email: last 8 digits of phone + @medicare.tn
                const last8Digits = onlyDigits.slice(-8);
                const baseEmail = `${last8Digits}@medicare.tn`;
                // Ensure email uniqueness (append random 2-digit suffix if needed)
                let finalEmail = baseEmail;
                const emailExists = await prisma.user.findUnique({ where: { email: finalEmail } }).catch(() => null);
                if (emailExists) {
                    const randomSuffix = Math.floor(10 + Math.random() * 90); // 2-digit number (10-99)
                    finalEmail = `${last8Digits}${randomSuffix}@medicare.tn`;
                }
                generatedEmail = finalEmail.toLowerCase();
                // Generate simple 4-digit password based on phone number
                const passwordDigits = onlyDigits.slice(-4); // Last 4 digits of phone
                generatedPassword = passwordDigits.padStart(4, '0'); // Ensure 4 digits
                console.log('🔐 Generated credentials:');
                console.log('  📧 Email:', generatedEmail);
                console.log('  🔑 Password:', generatedPassword);
                const passwordHash = await bcrypt.hash(generatedPassword, 12);
                console.log('🔒 Password hashed');
                // Create new patient user with generated credentials
                console.log('💾 Creating patient in database...');
                patient = await prisma.user.create({
                    data: {
                        email: generatedEmail,
                        passwordHash,
                        firstName: patientData.firstName,
                        lastName: patientData.lastName,
                        phoneNumber: phoneResult.normalized, // Save normalized phone
                        userType: 'patient',
                        isActive: true
                    }
                });
                console.log('✅ Patient created successfully!');
                console.log('👤 Patient ID:', patient.id);
                console.log('📧 Email:', patient.email);
                console.log('📱 Phone:', patient.phoneNumber);
            }
            else {
                console.log('ℹ️ Existing patient found, skipping creation');
                console.log('👤 Patient ID:', patient.id);
            }
            console.log('───────────────────────────────────────────────────');
            console.log('📤 STEP 3: CREATING RELATIONSHIP');
            console.log('───────────────────────────────────────────────────');
            // Determine relationship type based on caregiver's user type
            const caregiver = await prisma.user.findUnique({
                where: { id: tutorId },
                select: { userType: true }
            });
            const relationshipType = (caregiver?.userType === 'medecin') ? 'medecin' : 'tuteur';
            console.log('👨‍⚕️ Caregiver type:', caregiver?.userType);
            console.log('🔗 Relationship type to create:', relationshipType);
            // Create relationship between tutor/doctor and patient (idempotent-ish)
            console.log('🔗 Creating/updating relationship...');
            const relationship = await prisma.userRelationship.upsert({
                where: {
                    // Prisma unique selector for composite unique [patientId, relationshipType]
                    patientId_relationshipType: {
                        patientId: patient.id,
                        relationshipType: relationshipType
                    }
                },
                update: {
                    caregiverId: tutorId,
                    isActive: true
                },
                create: {
                    caregiverId: tutorId,
                    patientId: patient.id,
                    relationshipType: relationshipType,
                    isActive: true
                }
            });
            console.log('✅ Relationship created/updated successfully!');
            console.log('🔗 Relationship ID:', relationship.id);
            console.log('👨‍⚕️ Caregiver ID:', relationship.caregiverId);
            console.log('👤 Patient ID:', relationship.patientId);
            console.log('───────────────────────────────────────────────────');
            console.log('📤 STEP 3a: CREATING VOICE MESSAGE (if provided)');
            console.log('───────────────────────────────────────────────────');
            // If audio message exists, save it
            let voiceMessage = null;
            if (patientData.audioMessage) {
                console.log('🎤 Audio message URL provided:', patientData.audioMessage);
                console.log('⏱️ Audio duration:', patientData.audioDuration, 'seconds');
                try {
                    console.log('💾 Creating voice message in database...');
                    voiceMessage = await prisma.voiceMessage.create({
                        data: {
                            creatorId: tutorId,
                            patientId: patient.id,
                            fileUrl: patientData.audioMessage,
                            fileName: `invitation_${Date.now()}.m4a`,
                            durationSeconds: patientData.audioDuration || 0
                        }
                    });
                    console.log('✅ Voice message created successfully!');
                    console.log('🎤 Voice message ID:', voiceMessage.id);
                    console.log('🔗 File URL:', voiceMessage.fileUrl);
                    console.log('⏱️ Duration saved:', voiceMessage.durationSeconds, 'seconds');
                }
                catch (voiceError) {
                    console.error('❌ Failed to create voice message:', voiceError);
                    console.error('❌ Voice error details:', JSON.stringify(voiceError, null, 2));
                    // Don't fail the entire operation if voice message creation fails
                }
            }
            else {
                console.log('ℹ️ No audio message provided, skipping voice message creation');
            }
            // Send real SMS invitation via Infobip
            let smsMessage = `Bonjour ${patientData.firstName},\n` +
                `${tutor.firstName} ${tutor.lastName} vous invite à rejoindre MediCare.\n` +
                `Téléchargez l'app: https://medicare.app.link/invite/${patient.id}`;
            // If we generated credentials, include them in the SMS
            if (generatedEmail && generatedPassword) {
                smsMessage += `\n\nVos identifiants:\n` +
                    `📧 ${generatedEmail}\n` +
                    `🔑 ${generatedPassword}\n` +
                    `\nVous pouvez aussi vous connecter avec votre numéro de téléphone.`;
            }
            else {
                smsMessage += `\n\nVous avez déjà un compte. Connectez-vous avec votre email ou numéro de téléphone.`;
            }
            console.log('───────────────────────────────────────────────────');
            console.log('📱 STEP 4: SENDING SMS INVITATION');
            console.log('───────────────────────────────────────────────────');
            console.log('📞 Phone number:', patientData.phoneNumber);
            console.log('📧 Email:', generatedEmail);
            console.log('🔑 Password:', generatedPassword);
            console.log('📝 SMS message to send:');
            console.log(smsMessage);
            console.log('───────────────────────────────────────────────────');
            const smsResult = await smsService.sendInvitationSMS(patientData.phoneNumber, generatedEmail || '', generatedPassword || 'Utilisez votre numéro de téléphone');
            console.log('───────────────────────────────────────────────────');
            console.log('📱 SMS RESULT');
            console.log('───────────────────────────────────────────────────');
            console.log('Success:', smsResult.success);
            console.log('Message ID:', smsResult.messageId);
            console.log('Error:', smsResult.error);
            if (!smsResult.success) {
                console.error('❌ SMS sending failed:', smsResult.error);
            }
            else {
                console.log('✅ SMS sent successfully via Educanet API:', smsResult.messageId);
            }
            console.log('───────────────────────────────────────────────────');
            const result = {
                patientId: patient.id,
                relationshipId: relationship.id,
                voiceMessageId: voiceMessage?.id,
                smsSent: !!smsResult.success,
                phoneNumber: patientData.phoneNumber,
                message: 'Patient invitation sent successfully',
                generatedEmail: generatedEmail || undefined
            };
            console.log('═══════════════════════════════════════════════════');
            console.log('✅ PATIENT INVITATION PROCESS COMPLETED');
            console.log('═══════════════════════════════════════════════════');
            console.log('📊 Final Result:', JSON.stringify(result, null, 2));
            console.log('👤 Patient ID:', result.patientId);
            console.log('🔗 Relationship ID:', result.relationshipId);
            console.log('🎤 Voice message ID:', result.voiceMessageId);
            console.log('📱 SMS sent:', result.smsSent);
            console.log('📧 Generated email:', result.generatedEmail);
            console.log('═══════════════════════════════════════════════════');
            return result;
        }
        catch (error) {
            console.error('❌ Error in sendPatientInvitation:', error);
            console.error('❌ Error stack:', error.stack);
            throw new Error(`Failed to send patient invitation: ${error.message}`);
        }
    }
    /**
     * Manually confirm a patient's medication reminder by a tutor
     */
    async confirmMedicationManually(tutorId, reminderId) {
        try {
            // Load reminder with patient
            const reminder = await prisma.medicationReminder.findUnique({
                where: { id: reminderId },
                include: { patient: true }
            });
            if (!reminder) {
                throw new Error('Reminder not found');
            }
            // Ensure tutor is linked to patient
            const relation = await prisma.userRelationship.findFirst({
                where: {
                    caregiverId: tutorId,
                    patientId: reminder.patientId,
                    relationshipType: 'tuteur',
                    isActive: true
                }
            });
            if (!relation) {
                throw new Error('Unauthorized: tutor is not linked to this patient');
            }
            // If already confirmed, return current state
            if (reminder.status === 'confirmed' || reminder.status === 'manual_confirm') {
                return { success: true, status: reminder.status, reminderId: reminder.id };
            }
            const now = new Date();
            // Update reminder status
            const updated = await prisma.medicationReminder.update({
                where: { id: reminderId },
                data: {
                    status: 'manual_confirm',
                    confirmedAt: now,
                    confirmedBy: tutorId
                }
            });
            // Upsert confirmation record (unique per reminder)
            await prisma.medicationConfirmation.upsert({
                where: { reminderId: reminderId },
                update: {
                    confirmedBy: tutorId,
                    confirmationType: 'tuteur_manual',
                    confirmedAt: now
                },
                create: {
                    reminderId: reminderId,
                    confirmedBy: tutorId,
                    confirmationType: 'tuteur_manual'
                }
            });
            // Mark related alerts as acknowledged/read so they disappear from dashboard
            await prisma.alert.updateMany({
                where: {
                    reminderId: reminderId,
                    tuteurId: tutorId,
                    isRead: false
                },
                data: {
                    isRead: true,
                    status: 'acknowledged',
                    readAt: now
                }
            });
            return { success: true, status: updated.status, reminderId: updated.id };
        }
        catch (error) {
            console.error('Error confirming medication manually:', error);
            throw new Error('Failed to confirm medication');
        }
    }
    /**
     * Search tutor's patients by name, phone, or email
     */
    async searchPatients(tutorId, query) {
        try {
            const q = query.trim();
            if (!q)
                return [];
            const relationships = await prisma.userRelationship.findMany({
                where: {
                    caregiverId: tutorId,
                    relationshipType: 'tuteur',
                    isActive: true,
                    patient: {
                        OR: [
                            { firstName: { contains: q, mode: 'insensitive' } },
                            { lastName: { contains: q, mode: 'insensitive' } },
                            { email: { contains: q, mode: 'insensitive' } },
                            { phoneNumber: { contains: q } }
                        ]
                    }
                },
                include: {
                    patient: {
                        select: { id: true, firstName: true, lastName: true, phoneNumber: true, email: true }
                    }
                }
            });
            return relationships.map(r => ({
                id: r.patient.id,
                name: `${r.patient.firstName} ${r.patient.lastName}`,
                phoneNumber: r.patient.phoneNumber,
                email: r.patient.email
            }));
        }
        catch (error) {
            console.error('Error searching patients:', error);
            throw new Error('Failed to search patients');
        }
    }
    /**
     * Get a patient's profile for this tutor/doctor
     */
    async getPatientProfile(tutorId, patientId) {
        try {
            // Verify relationship - support both tuteur and medecin
            const relation = await prisma.userRelationship.findFirst({
                where: {
                    caregiverId: tutorId,
                    patientId,
                    relationshipType: { in: ['tuteur', 'medecin'] }, // Support both types
                    isActive: true
                }
            });
            if (!relation) {
                throw new Error('Unauthorized: caregiver is not linked to this patient');
            }
            const patient = await prisma.user.findUnique({
                where: { id: patientId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                    email: true,
                    createdAt: true,
                    lastLogin: true
                }
            });
            if (!patient)
                throw new Error('Patient not found');
            // Fetch active prescriptions with medication
            const prescriptions = await prisma.prescription.findMany({
                where: { patientId, isActive: true },
                include: {
                    medication: true,
                    schedules: true,
                    voiceMessage: true
                },
                orderBy: { createdAt: 'desc' }
            });
            // Transform prescriptions to include formatted schedules
            const formattedPrescriptions = prescriptions.map(prescription => {
                const schedules = prescription.schedules.map(schedule => {
                    // Extract HH:mm from scheduledTime
                    const time = new Date(schedule.scheduledTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                    return {
                        time: time,
                        days: schedule.daysOfWeek
                    };
                });
                return {
                    id: prescription.id,
                    name: prescription.medication.name,
                    dosage: prescription.medication.dosage || prescription.customDosage,
                    customDosage: prescription.customDosage,
                    instructions: prescription.instructions,
                    startDate: prescription.startDate,
                    endDate: prescription.endDate,
                    isActive: prescription.isActive,
                    isChronic: prescription.isChronic,
                    voiceMessageId: prescription.voiceMessageId,
                    voiceMessage: prescription.voiceMessage ? {
                        id: prescription.voiceMessage.id,
                        fileUrl: prescription.voiceMessage.fileUrl,
                        fileName: prescription.voiceMessage.fileName,
                        title: prescription.voiceMessage.title,
                        durationSeconds: prescription.voiceMessage.durationSeconds,
                        isActive: prescription.voiceMessage.isActive
                    } : null,
                    medication: {
                        id: prescription.medication.id,
                        name: prescription.medication.name,
                        dosage: prescription.medication.dosage,
                        form: prescription.medication.form,
                        genericName: prescription.medication.genericName,
                        description: prescription.medication.description
                    },
                    schedules: schedules,
                    scheduleType: prescription.schedules[0]?.scheduleType || 'daily',
                    intervalHours: prescription.schedules[0]?.intervalHours
                };
            });
            // Fetch today's reminders
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));
            const reminders = await prisma.medicationReminder.findMany({
                where: {
                    patientId,
                    scheduledFor: { gte: startOfDay, lte: endOfDay }
                },
                include: { prescription: { include: { medication: true } } },
                orderBy: { scheduledFor: 'asc' }
            });
            return { patient, prescriptions: formattedPrescriptions, reminders };
        }
        catch (error) {
            console.error('Error getting patient profile:', error);
            throw new Error('Failed to get patient profile');
        }
    }
    /**
     * Get patient adherence history (for doctors/tutors)
     */
    async getPatientAdherenceHistory(tutorId, patientId, daysBack = 30) {
        try {
            // Verify relationship - support both tuteur and medecin
            const relation = await prisma.userRelationship.findFirst({
                where: {
                    caregiverId: tutorId,
                    patientId,
                    relationshipType: { in: ['tuteur', 'medecin'] },
                    isActive: true
                }
            });
            if (!relation) {
                throw new Error('Unauthorized: caregiver is not linked to this patient');
            }
            // Use patient service to get adherence history
            const { patientService } = await import('./patient.service.js');
            return await patientService.getPatientAdherenceHistory(patientId, daysBack);
        }
        catch (error) {
            console.error('Error getting patient adherence history:', error);
            throw new Error('Failed to get patient adherence history');
        }
    }
    /**
     * Create a prescription for a tutor's patient
     */
    async createPrescriptionForPatient(tutorId, payload) {
        const { patientId, medicationName, medicationGenericName, medicationDosage, medicationForm, medicationDescription, medicationImageUrl, customDosage, instructions, schedules, voiceMessageId, isChronic, endDate, scheduleType, intervalHours } = payload;
        try {
            // Verify relationship - allow both tuteur and medecin
            const relation = await prisma.userRelationship.findFirst({
                where: {
                    caregiverId: tutorId,
                    patientId,
                    relationshipType: { in: ['tuteur', 'medecin'] },
                    isActive: true
                }
            });
            if (!relation) {
                throw new Error('Unauthorized: not linked to this patient');
            }
            // Find or create medication by name
            let medication = await prisma.medication.findFirst({
                where: { name: medicationName }
            });
            if (!medication) {
                medication = await prisma.medication.create({
                    data: {
                        name: medicationName,
                        genericName: medicationGenericName || undefined,
                        dosage: medicationDosage || undefined,
                        form: medicationForm || undefined,
                        description: medicationDescription || undefined,
                        imageUrl: medicationImageUrl || undefined
                    }
                });
            }
            // Create prescription - set startDate to beginning of today
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const prescription = await prisma.prescription.create({
                data: {
                    patientId,
                    medicationId: medication.id,
                    prescribedBy: tutorId,
                    voiceMessageId: voiceMessageId || undefined,
                    customDosage: customDosage || undefined,
                    instructions: instructions || undefined,
                    startDate: startOfToday,
                    endDate: endDate ? new Date(endDate) : null,
                    isChronic: !!isChronic
                }
            });
            // Create schedules
            for (const s of schedules) {
                // The frontend sends local time (e.g., "14:40")
                // We need to store it in a way that displays the same time on patient's device
                const [hhStr, mmStr] = s.time.split(':');
                const hh = parseInt(hhStr || '8', 10);
                const mm = parseInt(mmStr || '0', 10);
                // Create a date with today's date and the specified time in LOCAL timezone
                // This ensures 15:55 input = 15:55 notification time (not UTC)
                const scheduled = new Date();
                scheduled.setHours(hh, mm, 0, 0);
                console.log(`📅 Creating schedule for ${s.time}`);
                console.log(`   Input time: ${s.time}`);
                console.log(`   Scheduled time (local): ${scheduled.toLocaleString()}`);
                console.log(`   Stored as (ISO): ${scheduled.toISOString()}`);
                await prisma.medicationSchedule.create({
                    data: {
                        prescriptionId: prescription.id,
                        scheduledTime: scheduled,
                        daysOfWeek: s.days,
                        scheduleType: scheduleType || 'daily',
                        intervalHours: intervalHours ?? null,
                    }
                });
            }
            // 🔥 AUTOMATICALLY GENERATE REMINDERS FOR TODAY AND NEXT FEW DAYS
            console.log('🔄 Auto-generating reminders for new prescription...');
            try {
                // Generate reminders for today
                await reminderGeneratorService.generateTodaysReminders();
                // Generate reminders for next 7 days to ensure coverage
                await reminderGeneratorService.generateRemindersForNextDays(7);
                console.log('✅ Reminders auto-generated successfully for new prescription');
            }
            catch (reminderError) {
                console.error('⚠️ Warning: Failed to auto-generate reminders:', reminderError);
                // Don't fail the prescription creation if reminder generation fails
            }
            // Return created prescription with medication
            const created = await prisma.prescription.findUnique({
                where: { id: prescription.id },
                include: { medication: true, schedules: true }
            });
            // Send SMS notification to patient about new prescription
            try {
                const patient = await prisma.user.findUnique({
                    where: { id: patientId },
                    select: { phoneNumber: true }
                });
                if (patient?.phoneNumber) {
                    console.log('📱 Sending SMS notification to patient about new prescription...');
                    await smsService.sendUpdateNotification(patient.phoneNumber, 'new_prescription');
                    console.log('✅ SMS notification sent successfully');
                }
            }
            catch (smsError) {
                console.error('⚠️ Warning: Failed to send SMS notification:', smsError);
                // Don't fail the prescription creation if SMS fails
            }
            return created;
        }
        catch (error) {
            console.error('Error creating prescription for patient:', error);
            throw new Error('Failed to create prescription');
        }
    }
    /**
     * Update a prescription for a tutor's patient
     */
    async updatePrescriptionForPatient(tutorId, prescriptionId, payload) {
        try {
            // Verify prescription exists and belongs to a patient linked to this tutor
            const prescription = await prisma.prescription.findUnique({
                where: { id: prescriptionId },
                include: { patient: true, medication: true }
            });
            if (!prescription) {
                throw new Error('Prescription not found');
            }
            // Verify relationship - check both tuteur and medecin relationships
            const relation = await prisma.userRelationship.findFirst({
                where: {
                    caregiverId: tutorId,
                    patientId: prescription.patientId,
                    relationshipType: { in: ['tuteur', 'medecin'] },
                    isActive: true
                }
            });
            if (!relation) {
                throw new Error('Unauthorized: not linked to this patient');
            }
            // Handle medication update if provided
            let medicationId = prescription.medicationId;
            if (payload.medicationName) {
                let medication = await prisma.medication.findFirst({
                    where: { name: payload.medicationName }
                });
                if (!medication) {
                    medication = await prisma.medication.create({
                        data: {
                            name: payload.medicationName,
                            genericName: payload.medicationGenericName || undefined,
                            dosage: payload.medicationDosage || undefined,
                            form: payload.medicationForm || undefined,
                            description: payload.medicationDescription || undefined,
                            imageUrl: payload.medicationImageUrl || undefined
                        }
                    });
                }
                medicationId = medication.id;
            }
            // Update prescription
            const updatedPrescription = await prisma.prescription.update({
                where: { id: prescriptionId },
                data: {
                    medicationId,
                    voiceMessageId: payload.voiceMessageId !== undefined ? (payload.voiceMessageId || null) : prescription.voiceMessageId,
                    customDosage: payload.customDosage !== undefined ? payload.customDosage : prescription.customDosage,
                    instructions: payload.instructions !== undefined ? payload.instructions : prescription.instructions,
                    endDate: payload.endDate !== undefined ? (payload.endDate ? new Date(payload.endDate) : null) : prescription.endDate,
                    isChronic: payload.isChronic !== undefined ? payload.isChronic : prescription.isChronic
                }
            });
            // Update schedules if provided
            if (payload.schedules && payload.schedules.length > 0) {
                // Delete existing schedules
                await prisma.medicationSchedule.deleteMany({
                    where: { prescriptionId }
                });
                // Create new schedules
                for (const s of payload.schedules) {
                    // Validate that time exists
                    if (!s.time) {
                        console.warn('⚠️ Schedule missing time property, skipping:', s);
                        continue;
                    }
                    const [hhStr, mmStr] = s.time.split(':');
                    const scheduled = new Date();
                    const hh = parseInt(hhStr || '8', 10);
                    const mm = parseInt(mmStr || '0', 10);
                    // Use LOCAL time methods to preserve the entered time
                    // This ensures 15:55 input = 15:55 notification time (not UTC)
                    scheduled.setHours(hh, mm, 0, 0);
                    console.log(`📅 Updating schedule for ${s.time}`);
                    console.log(`   Input time: ${s.time}`);
                    console.log(`   Scheduled time (local): ${scheduled.toLocaleString()}`);
                    console.log(`   Stored as (ISO): ${scheduled.toISOString()}`);
                    await prisma.medicationSchedule.create({
                        data: {
                            prescriptionId,
                            scheduledTime: scheduled,
                            daysOfWeek: s.days || [],
                            scheduleType: payload.scheduleType || 'daily',
                            intervalHours: payload.intervalHours ?? null,
                        }
                    });
                }
                // Regenerate reminders
                console.log('🔄 Regenerating reminders for updated prescription...');
                try {
                    await reminderGeneratorService.generateTodaysReminders();
                    await reminderGeneratorService.generateRemindersForNextDays(7);
                }
                catch (reminderError) {
                    console.error('⚠️ Warning: Failed to regenerate reminders:', reminderError);
                }
            }
            // Return updated prescription with medication and schedules
            const result = await prisma.prescription.findUnique({
                where: { id: prescriptionId },
                include: { medication: true, schedules: true }
            });
            // Send SMS notification to patient about updated prescription
            try {
                const patient = await prisma.user.findUnique({
                    where: { id: prescription.patientId },
                    select: { phoneNumber: true }
                });
                if (patient?.phoneNumber) {
                    console.log('📱 Sending SMS notification to patient about prescription update...');
                    await smsService.sendUpdateNotification(patient.phoneNumber, 'updated_prescription');
                    console.log('✅ SMS notification sent successfully');
                }
            }
            catch (smsError) {
                console.error('⚠️ Warning: Failed to send SMS notification:', smsError);
                // Don't fail the prescription update if SMS fails
            }
            return result;
        }
        catch (error) {
            console.error('Error updating prescription:', error);
            throw new Error('Failed to update prescription');
        }
    }
    /**
     * Delete (deactivate) a prescription for a tutor's patient
     */
    async deletePrescriptionForPatient(tutorId, prescriptionId) {
        try {
            // Verify prescription exists and belongs to a patient linked to this tutor
            const prescription = await prisma.prescription.findUnique({
                where: { id: prescriptionId },
                include: { patient: true }
            });
            if (!prescription) {
                throw new Error('Prescription not found');
            }
            // Verify relationship - check both tuteur and medecin relationships
            const relation = await prisma.userRelationship.findFirst({
                where: {
                    caregiverId: tutorId,
                    patientId: prescription.patientId,
                    relationshipType: { in: ['tuteur', 'medecin'] },
                    isActive: true
                }
            });
            if (!relation) {
                throw new Error('Unauthorized: not linked to this patient');
            }
            // Soft delete: set isActive to false and track deletion
            await prisma.prescription.update({
                where: { id: prescriptionId },
                data: {
                    isActive: false,
                    deletedAt: new Date(),
                    deletedBy: tutorId
                }
            });
            // Also deactivate associated schedules
            await prisma.medicationSchedule.updateMany({
                where: { prescriptionId },
                data: { isActive: false }
            });
            // Cancel all future medication reminders for this prescription
            await prisma.medicationReminder.updateMany({
                where: {
                    prescriptionId: prescriptionId,
                    scheduledFor: { gt: new Date() },
                    status: { in: ['scheduled', 'sent'] }
                },
                data: {
                    status: 'cancelled'
                }
            });
            // Update patient's last modified timestamp for sync detection
            await prisma.user.update({
                where: { id: prescription.patientId },
                data: { updatedAt: new Date() }
            });
            console.log(`🗑️ Prescription ${prescriptionId} deleted by tutor ${tutorId}`);
            console.log(`📱 Patient ${prescription.patientId} lastModified updated for sync`);
            // Send SMS notification to patient about deleted prescription
            try {
                const patient = await prisma.user.findUnique({
                    where: { id: prescription.patientId },
                    select: { phoneNumber: true }
                });
                if (patient?.phoneNumber) {
                    console.log('📱 Sending SMS notification to patient about prescription deletion...');
                    await smsService.sendUpdateNotification(patient.phoneNumber, 'deleted_prescription');
                    console.log('✅ SMS notification sent successfully');
                }
            }
            catch (smsError) {
                console.error('⚠️ Warning: Failed to send SMS notification:', smsError);
                // Don't fail the prescription deletion if SMS fails
            }
            return { success: true, id: prescriptionId };
        }
        catch (error) {
            console.error('Error deleting prescription:', error);
            throw new Error('Failed to delete prescription');
        }
    }
    /**
     * Get all patients for a tutor with their basic information
     */
    async getAllPatientsForTutor(tutorId) {
        try {
            // Find all patients under this tutor or doctor (both relationship types)
            const relationships = await prisma.userRelationship.findMany({
                where: {
                    caregiverId: tutorId,
                    relationshipType: { in: ['tuteur', 'medecin'] }, // Support both tuteur and medecin
                    isActive: true,
                    patient: {
                        isActive: true
                    }
                },
                include: {
                    patient: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phoneNumber: true,
                            email: true,
                            createdAt: true,
                            lastLogin: true
                        }
                    }
                }
            });
            // Transform to match the expected structure
            const patients = await Promise.all(relationships.map(async (relationship) => {
                const patient = relationship.patient;
                // Use default age since dateOfBirth is not available
                const age = 70; // Default age
                // Get today's date range
                const today = new Date();
                const startOfDay = new Date(today.setHours(0, 0, 0, 0));
                const endOfDay = new Date(today.setHours(23, 59, 59, 999));
                // Get today's medication reminders for this patient
                const todaysReminders = await prisma.medicationReminder.findMany({
                    where: {
                        patientId: patient.id,
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
                // Calculate adherence rate (simplified version)
                let adherenceRate = 100;
                if (todaysReminders.length > 0) {
                    const takenCount = todaysReminders.filter(r => r.status === 'confirmed' || r.status === 'manual_confirm').length;
                    adherenceRate = Math.round((takenCount / todaysReminders.length) * 100);
                }
                // Get total active prescriptions count for display
                const activePrescriptionsCount = await prisma.prescription.count({
                    where: {
                        patientId: patient.id,
                        isActive: true
                    }
                });
                // Transform reminders to medications format
                const medications = todaysReminders.map(reminder => {
                    const scheduledTime = new Date(reminder.scheduledFor);
                    return {
                        id: reminder.id,
                        name: reminder.prescription.medication.name,
                        nextDue: scheduledTime.toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                        }),
                        status: reminder.status === 'confirmed' || reminder.status === 'manual_confirm' ? 'taken' :
                            reminder.status === 'missed' ? 'missed' : 'pending'
                    };
                });
                // Calculate last activity (simplified)
                const lastActivity = 'Il y a 2 heures'; // Placeholder
                return {
                    id: patient.id,
                    name: `${patient.firstName} ${patient.lastName}`,
                    age: age,
                    phoneNumber: patient.phoneNumber,
                    email: patient.email,
                    createdAt: patient.createdAt,
                    lastLogin: patient.lastLogin,
                    adherenceRate: adherenceRate,
                    medications: medications,
                    medicationCount: activePrescriptionsCount, // Total active prescriptions
                    lastActivity: lastActivity
                };
            }));
            return patients;
        }
        catch (error) {
            console.error('Error getting all patients for tutor:', error);
            throw new Error('Failed to get all patients for tutor');
        }
    }
    /**
     * List voice messages created by this tutor
     */
    async getVoiceMessages(tutorId, patientId) {
        try {
            // Get all patients linked to this tutor (allow both tuteur and medecin)
            const relations = await prisma.userRelationship.findMany({
                where: {
                    caregiverId: tutorId,
                    relationshipType: { in: ['tuteur', 'medecin'] },
                    isActive: true
                },
                select: { patientId: true }
            });
            const patientIds = relations.map(r => r.patientId);
            // Build where clause
            const whereClause = {
                isActive: true,
            };
            if (patientId) {
                // If filtering by specific patient, verify tutor has access
                if (!patientIds.includes(patientId)) {
                    throw new Error('Unauthorized: not linked to this patient');
                }
                whereClause.patientId = patientId;
            }
            else {
                // Otherwise, get all messages for tutor's patients
                whereClause.OR = [
                    { creatorId: tutorId }, // messages created by tutor/doctor
                    { patientId: { in: patientIds } } // messages tied to tutor's patients
                ];
            }
            const messages = await prisma.voiceMessage.findMany({
                where: whereClause,
                include: {
                    patient: { select: { id: true, firstName: true, lastName: true } },
                    creator: { select: { id: true, firstName: true, lastName: true, userType: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
            return messages.map(m => ({
                id: m.id,
                patient: { id: m.patient.id, name: `${m.patient.firstName} ${m.patient.lastName}` },
                creator: { id: m.creator.id, name: `${m.creator.firstName} ${m.creator.lastName}`, userType: m.creator.userType },
                durationSeconds: m.durationSeconds,
                createdAt: m.createdAt,
                fileUrl: m.fileUrl,
                fileName: m.fileName,
                title: m.title,
                isActive: m.isActive
            }));
        }
        catch (error) {
            console.error('Error fetching voice messages:', error);
            throw new Error('Failed to fetch voice messages');
        }
    }
    /**
     * Create a new voice message entry after upload
     */
    async createVoiceMessage(tutorId, data) {
        try {
            // Validate relationship - allow both tuteur and medecin
            const relation = await prisma.userRelationship.findFirst({
                where: {
                    caregiverId: tutorId,
                    patientId: data.patientId,
                    relationshipType: { in: ['tuteur', 'medecin'] },
                    isActive: true
                }
            });
            if (!relation) {
                throw new Error('Unauthorized: not linked to this patient');
            }
            const fileName = data.fileName || `voice_${Date.now()}.m4a`;
            const created = await prisma.voiceMessage.create({
                data: {
                    creatorId: tutorId,
                    patientId: data.patientId,
                    fileUrl: data.fileUrl,
                    fileName: fileName,
                    title: data.title && data.title.trim() ? data.title.trim() : fileName,
                    durationSeconds: data.durationSeconds || 0
                }
            });
            // Send SMS notification to patient about new voice message
            try {
                const patient = await prisma.user.findUnique({
                    where: { id: data.patientId },
                    select: { phoneNumber: true }
                });
                if (patient?.phoneNumber) {
                    console.log('📱 Sending SMS notification to patient about new voice message...');
                    await smsService.sendUpdateNotification(patient.phoneNumber, 'new_voice_message');
                    console.log('✅ SMS notification sent successfully');
                }
            }
            catch (smsError) {
                console.error('⚠️ Warning: Failed to send SMS notification:', smsError);
                // Don't fail the voice message creation if SMS fails
            }
            return created;
        }
        catch (error) {
            console.error('Error creating voice message:', error);
            throw new Error('Failed to create voice message');
        }
    }
    /**
     * Soft delete a voice message (creator only)
     */
    async deleteVoiceMessage(tutorId, voiceMessageId) {
        try {
            const existing = await prisma.voiceMessage.findUnique({
                where: { id: voiceMessageId },
                include: { patient: { select: { phoneNumber: true } } }
            });
            if (!existing || existing.creatorId !== tutorId) {
                throw new Error('Not found or unauthorized');
            }
            const deleted = await prisma.voiceMessage.update({
                where: { id: voiceMessageId },
                data: { isActive: false }
            });
            // Send SMS notification to patient about deleted voice message
            try {
                if (existing.patient?.phoneNumber) {
                    console.log('📱 Sending SMS notification to patient about voice message deletion...');
                    await smsService.sendUpdateNotification(existing.patient.phoneNumber, 'deleted_voice_message');
                    console.log('✅ SMS notification sent successfully');
                }
            }
            catch (smsError) {
                console.error('⚠️ Warning: Failed to send SMS notification:', smsError);
                // Don't fail the voice message deletion if SMS fails
            }
            return { success: true, id: deleted.id };
        }
        catch (error) {
            console.error('Error deleting voice message:', error);
            throw new Error('Failed to delete voice message');
        }
    }
    /**
     * Delete patient relationship (deactivate relationship)
     * Works for both tuteur and medecin relationships
     */
    async deletePatient(caregiverId, patientId) {
        try {
            // Check if patient exists
            const patient = await prisma.user.findUnique({
                where: { id: patientId, userType: 'patient' }
            });
            if (!patient) {
                throw new Error('Patient not found');
            }
            // Get caregiver's user type to determine relationship type
            const caregiver = await prisma.user.findUnique({
                where: { id: caregiverId },
                select: { userType: true }
            });
            if (!caregiver) {
                throw new Error('Caregiver not found');
            }
            const relationshipType = caregiver.userType === 'medecin' ? 'medecin' : 'tuteur';
            // Check if there's an existing relationship
            const existingRelationship = await prisma.userRelationship.findFirst({
                where: {
                    caregiverId: caregiverId,
                    patientId: patientId,
                    relationshipType: relationshipType
                }
            });
            if (existingRelationship) {
                // Deactivate the existing relationship
                await prisma.userRelationship.update({
                    where: { id: existingRelationship.id },
                    data: { isActive: false }
                });
                console.log(`Deactivated relationship between ${relationshipType} ${caregiverId} and patient ${patientId}`);
                return { success: true, message: 'Patient relationship deactivated' };
            }
            else {
                throw new Error('No relationship found between caregiver and patient');
            }
        }
        catch (error) {
            console.error('Error deleting patient relationship:', error);
            throw new Error(error.message || 'Failed to delete patient relationship');
        }
    }
}
export default new TutorService();
