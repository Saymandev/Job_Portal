import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationsModule } from '../applications/applications.module';
import { Application, ApplicationSchema } from '../applications/schemas/application.schema';
import { JobsModule } from '../jobs/jobs.module';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import { MailModule } from '../mail/mail.module';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';
import { EnhancedNotificationsService } from './enhanced-notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationSchema } from './schemas/notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: User.name, schema: UserSchema },
      { name: Job.name, schema: JobSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    MailModule,
    UsersModule,
    forwardRef(() => JobsModule),
    forwardRef(() => ApplicationsModule),
    forwardRef(() => SubscriptionsModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, EnhancedNotificationsService],
  exports: [NotificationsService, NotificationsGateway, EnhancedNotificationsService],
})
export class NotificationsModule {}
