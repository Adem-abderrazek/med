import * as cron from 'node-cron';
import { reminderGeneratorService } from './reminder-generator.service.js';

export class SchedulerService {
  private jobs: Map<string, any> = new Map();

  /**
   * Start all scheduled jobs
   */
  start(): void {
    console.log('🚀 Starting scheduler service...');
    
    // Generate reminders daily at 6:00 AM
    this.scheduleReminderGeneration();
    
    // Clean up old reminders weekly on Sunday at 2:00 AM
    this.scheduleReminderCleanup();
    
    console.log('✅ Scheduler service started successfully');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    console.log('🛑 Stopping scheduler service...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️  Stopped job: ${name}`);
    });
    
    this.jobs.clear();
    console.log('✅ Scheduler service stopped');
  }

  /**
   * Schedule daily reminder generation
   */
  private scheduleReminderGeneration(): void {
    const job = cron.schedule('0 6 * * *', async () => {
      console.log('⏰ Running daily reminder generation...');
      try {
        await reminderGeneratorService.generateTodaysReminders();
        console.log('✅ Daily reminder generation completed');
      } catch (error) {
        console.error('❌ Error in daily reminder generation:', error);
      }
    }, {
      timezone: 'Africa/Tunis' // Tunisian time (CET/CEST)
    });

    this.jobs.set('daily-reminder-generation', job);
    console.log('📅 Scheduled daily reminder generation at 6:00 AM (Tunisia time)');
  }

  /**
   * Schedule weekly reminder cleanup
   */
  private scheduleReminderCleanup(): void {
    const job = cron.schedule('0 2 * * 0', async () => {
      console.log('🧹 Running weekly reminder cleanup...');
      try {
        await reminderGeneratorService.cleanupOldReminders();
        console.log('✅ Weekly reminder cleanup completed');
      } catch (error) {
        console.error('❌ Error in weekly reminder cleanup:', error);
      }
    }, {
      timezone: 'Africa/Tunis' // Tunisian time (CET/CEST)
    });

    this.jobs.set('weekly-reminder-cleanup', job);
    console.log('🗑️  Scheduled weekly reminder cleanup on Sundays at 2:00 AM (Tunisia time)');
  }

  /**
   * Get status of all scheduled jobs
   */
  getJobsStatus(): { name: string; running: boolean }[] {
    const status: { name: string; running: boolean }[] = [];
    
    this.jobs.forEach((job, name) => {
      status.push({
        name,
        running: job.running
      });
    });
    
    return status;
  }

  /**
   * Manually trigger reminder generation for testing
   */
  async triggerReminderGeneration(): Promise<void> {
    console.log('🔧 Manually triggering reminder generation...');
    try {
      await reminderGeneratorService.generateTodaysReminders();
      console.log('✅ Manual reminder generation completed');
    } catch (error) {
      console.error('❌ Error in manual reminder generation:', error);
      throw error;
    }
  }
}

export const schedulerService = new SchedulerService();
