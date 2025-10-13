import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsModule } from '../jobs/jobs.module';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { CoverLetterTemplatesController } from './cover-letter-templates.controller';
import { CoverLetterTemplatesService } from './cover-letter-templates.service';
import { Application, ApplicationSchema } from './schemas/application.schema';
import { CoverLetterTemplate, CoverLetterTemplateSchema } from './schemas/cover-letter-template.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
      { name: Job.name, schema: JobSchema },
      { name: User.name, schema: UserSchema },
      { name: CoverLetterTemplate.name, schema: CoverLetterTemplateSchema },
    ]),
    forwardRef(() => JobsModule),
    MailModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [ApplicationsController, CoverLetterTemplatesController],
  providers: [ApplicationsService, CoverLetterTemplatesService],
  exports: [ApplicationsService, CoverLetterTemplatesService],
})
export class ApplicationsModule {}

