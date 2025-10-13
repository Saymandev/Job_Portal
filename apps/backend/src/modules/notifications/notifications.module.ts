import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationsModule } from '../applications/applications.module';
import { JobsModule } from '../jobs/jobs.module';
import { MailModule } from '../mail/mail.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
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
    ]),
    MailModule,
    UsersModule,
    JobsModule,
    ApplicationsModule,
    SubscriptionsModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, EnhancedNotificationsService],
  exports: [NotificationsService, NotificationsGateway, EnhancedNotificationsService],
})
export class NotificationsModule {}
