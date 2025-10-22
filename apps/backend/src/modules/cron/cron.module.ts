import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlockedIp, BlockedIpSchema } from '../../common/schemas/blocked-ip.schema';
import { FraudDetectionService } from '../../common/services/fraud-detection.service';
import { IpBlockService } from '../../common/services/ip-block.service';
import { Activity, ActivitySchema } from '../admin/schemas/activity.schema';
import { AdvancedAnalyticsModule } from '../advanced-analytics/advanced-analytics.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { BrandingModule } from '../branding/branding.module';
import { JobsModule } from '../jobs/jobs.module';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import { MailModule } from '../mail/mail.module';
import { MessagingPermissionsModule } from '../messaging-permissions/messaging-permissions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { CronService } from './cron.service';
import { IpBlockCronService } from './ip-block-cron.service';
import { NotificationCronService } from './notification-cron.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: BlockedIp.name, schema: BlockedIpSchema },
      { name: User.name, schema: UserSchema },
      { name: Activity.name, schema: ActivitySchema },
    ]),
    forwardRef(() => JobsModule), 
    MailModule, 
    MessagingPermissionsModule, 
    forwardRef(() => NotificationsModule),
    forwardRef(() => SubscriptionsModule),
    forwardRef(() => ApiKeysModule),
    forwardRef(() => AdvancedAnalyticsModule),
    forwardRef(() => BrandingModule)
  ],
  providers: [CronService, NotificationCronService, IpBlockCronService, IpBlockService, FraudDetectionService],
})
export class CronModule {}

