import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ApplicationsModule } from '../applications/applications.module';
import { Application, ApplicationSchema } from '../applications/schemas/application.schema';
import { JobsModule } from '../jobs/jobs.module';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AdvancedAnalyticsController } from './advanced-analytics.controller';
import { AdvancedAnalyticsService } from './advanced-analytics.service';
import { AnalyticsInsight, AnalyticsInsightSchema } from './schemas/analytics-insight.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AnalyticsInsight.name, schema: AnalyticsInsightSchema },
      { name: Job.name, schema: JobSchema },
      { name: Application.name, schema: ApplicationSchema },
    ]),
    NotificationsModule,
    SubscriptionsModule,
    JobsModule,
    ApplicationsModule,
    AnalyticsModule,
  ],
  controllers: [AdvancedAnalyticsController],
  providers: [AdvancedAnalyticsService],
  exports: [AdvancedAnalyticsService],
})
export class AdvancedAnalyticsModule {}
