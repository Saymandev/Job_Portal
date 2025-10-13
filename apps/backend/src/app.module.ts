import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

// Feature Modules
import { HealthController } from './health.controller';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { CronModule } from './modules/cron/cron.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { InterviewsModule } from './modules/interviews/interviews.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { MailModule } from './modules/mail/mail.module';
import { MessagingPermissionsModule } from './modules/messaging-permissions/messaging-permissions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { UploadModule } from './modules/upload/upload.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),

    // Task Scheduling
    ScheduleModule.forRoot(),

    // Feature Modules
    AuthModule,
    UsersModule,
    JobsModule,
    ApplicationsModule,
    CompaniesModule,
    SubscriptionsModule,
    ChatModule,
    MessagingPermissionsModule,
    NotificationsModule,
    InterviewsModule,
    IntegrationsModule,
    AnalyticsModule,
    DashboardModule,
    AdminModule,
    MailModule,
    UploadModule,
    CronModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

