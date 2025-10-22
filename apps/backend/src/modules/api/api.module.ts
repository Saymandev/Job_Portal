import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { ApplicationsModule } from '../applications/applications.module';
import { CompaniesModule } from '../companies/companies.module';
import { JobsModule } from '../jobs/jobs.module';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';

@Module({
  imports: [
    ApiKeysModule,
    JobsModule,
    ApplicationsModule,
    CompaniesModule,
    AnalyticsModule,
  ],
  controllers: [ApiController],
  providers: [ApiService, ApiKeyGuard],
  exports: [ApiService],
})
export class ApiModule {}
