-- CreateEnum
CREATE TYPE "public"."UserType" AS ENUM ('tuteur', 'medecin', 'patient');

-- CreateEnum
CREATE TYPE "public"."RelationshipType" AS ENUM ('tuteur', 'medecin');

-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('pending', 'accepted', 'expired');

-- CreateEnum
CREATE TYPE "public"."ReminderStatus" AS ENUM ('scheduled', 'sent', 'confirmed', 'missed', 'manual_confirm');

-- CreateEnum
CREATE TYPE "public"."ConfirmationType" AS ENUM ('patient', 'tuteur_manual');

-- CreateEnum
CREATE TYPE "public"."AlertType" AS ENUM ('missed_medication', 'no_response');

-- CreateEnum
CREATE TYPE "public"."AlertStatus" AS ENUM ('pending', 'sent', 'acknowledged');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "userType" "public"."UserType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_relationships" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "relationshipType" "public"."RelationshipType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invitations" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "patientPhoneNumber" TEXT NOT NULL,
    "patientFirstName" TEXT NOT NULL,
    "patientLastName" TEXT NOT NULL,
    "invitationToken" TEXT NOT NULL,
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'pending',
    "senderType" "public"."RelationshipType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."medications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "dosage" TEXT,
    "form" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."prescriptions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "prescribedBy" TEXT NOT NULL,
    "customDosage" TEXT,
    "instructions" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."medication_schedules" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "daysOfWeek" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."voice_messages" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."standard_voice_messages" (
    "id" TEXT NOT NULL,
    "messageKey" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "durationSeconds" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "standard_voice_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."medication_reminders" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "voiceMessageId" TEXT,
    "standardVoiceMessageId" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "public"."ReminderStatus" NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,

    CONSTRAINT "medication_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."medication_confirmations" (
    "id" TEXT NOT NULL,
    "reminderId" TEXT NOT NULL,
    "confirmedBy" TEXT NOT NULL,
    "confirmationType" "public"."ConfirmationType" NOT NULL,
    "notes" TEXT,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medication_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."alerts" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tuteurId" TEXT NOT NULL,
    "reminderId" TEXT,
    "alertType" "public"."AlertType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."AlertStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "fcmToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationPreferences" JSONB,
    "appSettings" JSONB,
    "timezone" TEXT DEFAULT 'Africa/Tunis',
    "language" TEXT DEFAULT 'fr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "unique_active_relationship" ON "public"."user_relationships"("patientId", "relationshipType");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_invitationToken_key" ON "public"."invitations"("invitationToken");

-- CreateIndex
CREATE UNIQUE INDEX "standard_voice_messages_messageKey_key" ON "public"."standard_voice_messages"("messageKey");

-- CreateIndex
CREATE UNIQUE INDEX "medication_confirmations_reminderId_key" ON "public"."medication_confirmations"("reminderId");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_userId_key" ON "public"."user_sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_sessionToken_key" ON "public"."user_sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "public"."user_settings"("userId");

-- AddForeignKey
ALTER TABLE "public"."user_relationships" ADD CONSTRAINT "user_relationships_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_relationships" ADD CONSTRAINT "user_relationships_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invitations" ADD CONSTRAINT "invitations_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prescriptions" ADD CONSTRAINT "prescriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prescriptions" ADD CONSTRAINT "prescriptions_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "public"."medications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."prescriptions" ADD CONSTRAINT "prescriptions_prescribedBy_fkey" FOREIGN KEY ("prescribedBy") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."medication_schedules" ADD CONSTRAINT "medication_schedules_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "public"."prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."voice_messages" ADD CONSTRAINT "voice_messages_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."voice_messages" ADD CONSTRAINT "voice_messages_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."medication_reminders" ADD CONSTRAINT "medication_reminders_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "public"."prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."medication_reminders" ADD CONSTRAINT "medication_reminders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."medication_reminders" ADD CONSTRAINT "medication_reminders_voiceMessageId_fkey" FOREIGN KEY ("voiceMessageId") REFERENCES "public"."voice_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."medication_reminders" ADD CONSTRAINT "medication_reminders_standardVoiceMessageId_fkey" FOREIGN KEY ("standardVoiceMessageId") REFERENCES "public"."standard_voice_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."medication_reminders" ADD CONSTRAINT "medication_reminders_confirmedBy_fkey" FOREIGN KEY ("confirmedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."medication_confirmations" ADD CONSTRAINT "medication_confirmations_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "public"."medication_reminders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."medication_confirmations" ADD CONSTRAINT "medication_confirmations_confirmedBy_fkey" FOREIGN KEY ("confirmedBy") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alerts" ADD CONSTRAINT "alerts_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alerts" ADD CONSTRAINT "alerts_tuteurId_fkey" FOREIGN KEY ("tuteurId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alerts" ADD CONSTRAINT "alerts_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "public"."medication_reminders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
