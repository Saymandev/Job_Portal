import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobsService } from '../jobs/jobs.service';
import { MailService } from '../mail/mail.service';
import { MessagingPermissionsService } from '../messaging-permissions/messaging-permissions.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private jobsService: JobsService,
    private mailService: MailService,
    private messagingPermissionsService: MessagingPermissionsService,
    private notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredJobs() {
    this.logger.log('Running job expiry check...');
    try {
      await this.jobsService.expireJobs();
      this.logger.log('Job expiry check completed');
    } catch (error) {
      this.logger.error('Error during job expiry check', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendDailySummaries() {
    this.logger.log('Sending daily summaries...');
    try {
      // Note: This is a placeholder for daily summary emails
      // In production, you would:
      // 1. Fetch all users who opted in for daily summaries
      // 2. Get their relevant stats (new jobs, applications, messages)
      // 3. Send personalized emails using mailService.sendDailySummary()
      
      // Example implementation (commented out):
      // const users = await this.userModel.find({ emailPreferences: { dailySummary: true } });
      // for (const user of users) {
      //   const summary = await this.getUserSummary(user._id);
      //   await this.mailService.sendDailySummary(user.email, summary);
      // }
      
      this.logger.log('Daily summaries sent (currently disabled)');
    } catch (error) {
      this.logger.error('Error sending daily summaries', error);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async weeklyCleanup() {
    this.logger.log('Running weekly cleanup...');
    try {
      // Cleanup tasks:
      // 1. Remove expired email verification tokens
      // 2. Clean up old password reset tokens
      // 3. Archive old conversations
      // 4. Clean up orphaned uploads
      // 5. Clean up expired messaging permissions
      // 6. Clean up old notifications
      
      // Clean up expired messaging permissions
      const expiredPermissions = await this.messagingPermissionsService.cleanupExpiredPermissions();
      this.logger.log(`Cleaned up ${expiredPermissions.modifiedCount} expired messaging permissions`);
      
      // Clean up old notifications (older than 30 days)
      const cleanedNotifications = await this.notificationsService.cleanupOldNotifications(30);
      this.logger.log(`Cleaned up ${cleanedNotifications.deletedCount} old notifications`);
      
      this.logger.log('Weekly cleanup completed');
    } catch (error) {
      this.logger.error('Error during weekly cleanup', error);
    }
  }
}

