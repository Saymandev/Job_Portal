import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Application, ApplicationSchema } from '../applications/schemas/application.schema';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InterviewsController } from './interviews.controller';
import { InterviewsCronService } from './interviews.cron';
import { InterviewsService } from './interviews.service';
import { Interview, InterviewSchema } from './schemas/interview.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Interview.name, schema: InterviewSchema },
      { name: Application.name, schema: ApplicationSchema },
    ]),
    MailModule,
    NotificationsModule,
  ],
  controllers: [InterviewsController],
  providers: [InterviewsService, InterviewsCronService],
  exports: [InterviewsService],
})
export class InterviewsModule {}
