import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsModule } from '../jobs/jobs.module';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import { MailModule } from '../mail/mail.module';
import { MessagingPermissionsModule } from '../messaging-permissions/messaging-permissions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';
import { CronService } from './cron.service';
import { NotificationCronService } from './notification-cron.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    JobsModule, 
    MailModule, 
    MessagingPermissionsModule, 
    NotificationsModule
  ],
  providers: [CronService, NotificationCronService],
})
export class CronModule {}

