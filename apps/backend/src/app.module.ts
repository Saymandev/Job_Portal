import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';
import { MonitoringService } from './common/services/monitoring.service';

// Feature Modules
import { HealthController } from './health.controller';
import { AccountManagersModule } from './modules/account-managers/account-managers.module';
import { AdminModule } from './modules/admin/admin.module';
import { AdvancedAnalyticsModule } from './modules/advanced-analytics/advanced-analytics.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { ApiModule } from './modules/api/api.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { AuthModule } from './modules/auth/auth.module';
import { BrandingModule } from './modules/branding/branding.module';
import { BulkImportModule } from './modules/bulk-import/bulk-import.module';
import { ChatModule } from './modules/chat/chat.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { CronModule } from './modules/cron/cron.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { InterviewsModule } from './modules/interviews/interviews.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { MailModule } from './modules/mail/mail.module';
import { MessagingPermissionsModule } from './modules/messaging-permissions/messaging-permissions.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PrioritySupportModule } from './modules/priority-support/priority-support.module';
import { PublicModule } from './modules/public/public.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { UploadModule } from './modules/upload/upload.module';
import { UsersModule } from './modules/users/users.module';

// Security Services
import { IpBlockGuard } from './common/guards/ip-block.guard';
import { AuditLog, AuditLogSchema } from './common/schemas/audit-log.schema';
import { BlockedIp, BlockedIpSchema } from './common/schemas/blocked-ip.schema';
import { AuditService } from './common/services/audit.service';
import { FraudDetectionService } from './common/services/fraud-detection.service';
import { IpBlockService } from './common/services/ip-block.service';
import { SanitizationService } from './common/services/sanitization.service';
import { Activity, ActivitySchema } from './modules/admin/schemas/activity.schema';
import { User, UserSchema } from './modules/users/schemas/user.schema';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/backend/.env'],
      validate: (parsedEnv: Record<string, any>) => {
        // Merge runtime env (Render) with any parsed .env (local), giving precedence to runtime
        const merged = { ...parsedEnv, ...process.env } as Record<string, any>;
        const requiredKeys = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'];
        const missingKeys = requiredKeys.filter(
          (key) => !merged[key] || String(merged[key]).trim() === '',
        );
        if (missingKeys.length > 0) {
          throw new Error(
            `Missing required environment variables: ${missingKeys.join(', ')}`,
          );
        }
        return merged;
      },
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
    ModerationModule,
    NotificationsModule,
    InterviewsModule,
    IntegrationsModule,
    AnalyticsModule,
    DashboardModule,
    AdminModule,
    MailModule,
    UploadModule,
    PublicModule,
    CronModule,
    ApiKeysModule,
    ApiModule,
    BrandingModule,
    BulkImportModule,
    AccountManagersModule,
    PrioritySupportModule,
    AdvancedAnalyticsModule,
    
    // Security Module
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: BlockedIp.name, schema: BlockedIpSchema },
      { name: User.name, schema: UserSchema },
      { name: Activity.name, schema: ActivitySchema },
    ]),
  ],
  controllers: [HealthController],
  providers: [
    AuditService, 
    SanitizationService, 
    IpBlockService, 
    FraudDetectionService, 
    IpBlockGuard,
    MonitoringService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
  ],
  exports: [AuditService, SanitizationService, IpBlockService, FraudDetectionService, IpBlockGuard, MonitoringService],
})
export class AppModule {}

