import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Application, ApplicationSchema } from '../applications/schemas/application.schema';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ApplicationAnalyticsService } from './application-analytics.service';
import { SalaryDataService } from './salary-data.service';
import { SalaryUpdateService } from './salary-update.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
      { name: Job.name, schema: JobSchema },
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ApplicationAnalyticsService, SalaryDataService, SalaryUpdateService],
  exports: [AnalyticsService, ApplicationAnalyticsService, SalaryDataService, SalaryUpdateService],
})
export class AnalyticsModule {}
