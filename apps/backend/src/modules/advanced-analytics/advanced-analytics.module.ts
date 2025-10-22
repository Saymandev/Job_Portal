import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationsModule } from '../applications/applications.module';
import { JobsModule } from '../jobs/jobs.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AdvancedAnalyticsController } from './advanced-analytics.controller';
import { AdvancedAnalyticsService } from './advanced-analytics.service';
import { AnalyticsInsight, AnalyticsInsightSchema } from './schemas/analytics-insight.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AnalyticsInsight.name, schema: AnalyticsInsightSchema }]),
    SubscriptionsModule,
    JobsModule,
    ApplicationsModule,
  ],
  controllers: [AdvancedAnalyticsController],
  providers: [AdvancedAnalyticsService],
  exports: [AdvancedAnalyticsService],
})
export class AdvancedAnalyticsModule {}
