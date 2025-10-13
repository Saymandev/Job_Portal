import { AuditLog, AuditLogSchema } from '@/common/schemas/audit-log.schema';
import { AuditService } from '@/common/services/audit.service';
import { SanitizationService } from '@/common/services/sanitization.service';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { SavedJobsController } from './saved-jobs.controller';
import { SavedJobsService } from './saved-jobs.service';
import { Job, JobSchema } from './schemas/job.schema';
import { SavedJob, SavedJobSchema } from './schemas/saved-job.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: Company.name, schema: CompanySchema },
      { name: User.name, schema: UserSchema },
      { name: SavedJob.name, schema: SavedJobSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [JobsController, SavedJobsController],
  providers: [JobsService, SavedJobsService, AuditService, SanitizationService],
  exports: [JobsService, SavedJobsService],
})
export class JobsModule {}

