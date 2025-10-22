import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Application, ApplicationSchema } from '../applications/schemas/application.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { DirectMessagingController } from './direct-messaging.controller';
import { DirectMessagingService } from './direct-messaging.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Application.name, schema: ApplicationSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [DirectMessagingController],
  providers: [DirectMessagingService],
  exports: [DirectMessagingService],
})
export class MessagingModule {}
