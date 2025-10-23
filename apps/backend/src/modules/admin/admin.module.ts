import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlockedIp, BlockedIpSchema } from '../../common/schemas/blocked-ip.schema';
import { FraudDetectionService } from '../../common/services/fraud-detection.service';
import { IpBlockService } from '../../common/services/ip-block.service';
import { AccountManagersModule } from '../account-managers/account-managers.module';
import { AccountManager, AccountManagerSchema } from '../account-managers/schemas/account-manager.schema';
import { AdvancedAnalyticsModule } from '../advanced-analytics/advanced-analytics.module';
import { AnalyticsInsight, AnalyticsInsightSchema } from '../advanced-analytics/schemas/analytics-insight.schema';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { ApiKey, ApiKeySchema } from '../api-keys/schemas/api-key.schema';
import { Application, ApplicationSchema } from '../applications/schemas/application.schema';
import { BrandingModule } from '../branding/branding.module';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { InterviewsModule } from '../interviews/interviews.module';
import { InterviewSession, InterviewSessionSchema } from '../interviews/schemas/interview-session.schema';
import { InterviewTemplate, InterviewTemplateSchema } from '../interviews/schemas/interview-template.schema';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import { PrioritySupportModule } from '../priority-support/priority-support.module';
import { SupportTicket, SupportTicketSchema } from '../priority-support/schemas/support-ticket.schema';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ActivityService } from './activity.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { IpManagementController } from './ip-management.controller';
import { PlatformSettingsService } from './platform-settings.service';
import { Activity, ActivitySchema } from './schemas/activity.schema';
import { PlatformSettings, PlatformSettingsSchema } from './schemas/platform-settings.schema';
// import { WhiteLabelConfig, WhiteLabelConfigSchema } from '../branding/schemas/white-label-config.schema';

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
      { name: BlockedIp.name, schema: BlockedIpSchema },
      { name: ApiKey.name, schema: ApiKeySchema },
      { name: InterviewTemplate.name, schema: InterviewTemplateSchema },
      { name: InterviewSession.name, schema: InterviewSessionSchema },
      { name: AccountManager.name, schema: AccountManagerSchema },
      { name: SupportTicket.name, schema: SupportTicketSchema },
      { name: AnalyticsInsight.name, schema: AnalyticsInsightSchema },
      // { name: WhiteLabelConfig.name, schema: WhiteLabelConfigSchema },
    ]),
    AdvancedAnalyticsModule,
    AnalyticsModule,
    ApiKeysModule,
    InterviewsModule,
    AccountManagersModule,
    PrioritySupportModule,
    BrandingModule,
  ],
  controllers: [AdminController, IpManagementController],
  providers: [AdminService, ActivityService, PlatformSettingsService, IpBlockService, FraudDetectionService],
  exports: [AdminService, ActivityService, PlatformSettingsService, IpBlockService, FraudDetectionService],
})
export class AdminModule {}

