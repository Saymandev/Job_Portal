import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Application, ApplicationSchema } from '../applications/schemas/application.schema';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ActivityService } from './activity.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PlatformSettingsService } from './platform-settings.service';
import { Activity, ActivitySchema } from './schemas/activity.schema';
import { PlatformSettings, PlatformSettingsSchema } from './schemas/platform-settings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Job.name, schema: JobSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Activity.name, schema: ActivitySchema },
      { name: PlatformSettings.name, schema: PlatformSettingsSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, ActivityService, PlatformSettingsService],
  exports: [AdminService, ActivityService, PlatformSettingsService],
})
export class AdminModule {}

