-- AlterTable
ALTER TABLE "public"."medication_reminders" ADD COLUMN     "pushNotificationId" TEXT,
ADD COLUMN     "pushNotificationSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tutorAlertAt" TIMESTAMP(3),
ADD COLUMN     "tutorAlertSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "expoPushToken" TEXT,
ADD COLUMN     "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
