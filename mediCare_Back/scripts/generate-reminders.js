import { PrismaClient } from '@prisma/client';
import { reminderGeneratorService } from '../dist/services/reminder-generator.service.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting reminder generation script...');
  
  try {
    // Generate reminders for today
    console.log('📅 Generating reminders for today...');
    await reminderGeneratorService.generateTodaysReminders();
    
    // Generate reminders for the next 7 days
    console.log('📅 Generating reminders for the next 7 days...');
    await reminderGeneratorService.generateRemindersForNextDays(7);
    
    console.log('✅ Reminder generation completed successfully!');
    
    // Show some stats
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    const todaysReminders = await prisma.medicationReminder.count({
      where: {
        scheduledFor: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
    
    console.log(`📊 Total reminders for today: ${todaysReminders}`);
    
  } catch (error) {
    console.error('❌ Error generating reminders:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
