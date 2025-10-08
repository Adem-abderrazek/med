/*
  Warnings:

  - The `daysOfWeek` column on the `medication_schedules` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."ScheduleType" AS ENUM ('daily', 'weekly', 'interval', 'monthly', 'custom');

-- AlterTable
ALTER TABLE "public"."medication_reminders" ADD COLUMN     "snoozedUntil" TIMESTAMP(3),
ADD COLUMN     "windowEndMinutes" INTEGER,
ADD COLUMN     "windowStartMinutes" INTEGER;

-- AlterTable
ALTER TABLE "public"."medication_schedules" ADD COLUMN     "intervalHours" INTEGER,
ADD COLUMN     "lastGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "scheduleType" "public"."ScheduleType" NOT NULL DEFAULT 'daily',
DROP COLUMN "daysOfWeek",
ADD COLUMN     "daysOfWeek" INTEGER[];

-- AlterTable
ALTER TABLE "public"."prescriptions" ADD COLUMN     "isChronic" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."medication_schedule_exceptions" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "medication_schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reminder_delivery_logs" (
    "id" TEXT NOT NULL,
    "reminderId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "provider" TEXT,
    "providerId" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_delivery_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."medication_schedule_exceptions" ADD CONSTRAINT "medication_schedule_exceptions_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."medication_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reminder_delivery_logs" ADD CONSTRAINT "reminder_delivery_logs_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "public"."medication_reminders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
