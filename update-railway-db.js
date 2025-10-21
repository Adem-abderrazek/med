import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function updateRailwayDatabase() {
  try {
    console.log('🔄 Updating Railway database schema...');
    
    // Check if we can connect to Railway database
    await prisma.$connect();
    console.log('✅ Connected to Railway database');
    
    // Add deletedAt and deletedBy columns to Prescription table
    console.log('📝 Adding deletedAt and deletedBy columns...');
    await prisma.$executeRaw`
      ALTER TABLE "Prescription" 
      ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
    `;
    
    // Add cancelled status to ReminderStatus enum
    console.log('📝 Adding cancelled status to ReminderStatus enum...');
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ReminderStatus')) THEN
          ALTER TYPE "ReminderStatus" ADD VALUE 'cancelled';
        END IF;
      END $$;
    `;
    
    console.log('✅ Railway database schema updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating Railway schema:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateRailwayDatabase()
  .then(() => {
    console.log('🎉 Railway database update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Railway database update failed:', error);
    process.exit(1);
  });
