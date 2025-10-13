-- AlterTable
ALTER TABLE "public"."prescriptions" ADD COLUMN     "voiceMessageId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."prescriptions" ADD CONSTRAINT "prescriptions_voiceMessageId_fkey" FOREIGN KEY ("voiceMessageId") REFERENCES "public"."voice_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
