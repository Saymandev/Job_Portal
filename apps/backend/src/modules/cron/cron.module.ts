import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { MailModule } from '../mail/mail.module';
import { MessagingPermissionsModule } from '../messaging-permissions/messaging-permissions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CronService } from './cron.service';

@Module({
  imports: [
    JobsModule, 
    MailModule, 
    MessagingPermissionsModule, 
    NotificationsModule
  ],
  providers: [CronService],
})
export class CronModule {}

