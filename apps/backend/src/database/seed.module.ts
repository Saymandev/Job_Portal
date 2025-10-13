import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Company, CompanySchema } from '../modules/companies/schemas/company.schema';
import { Job, JobSchema } from '../modules/jobs/schemas/job.schema';
import { Subscription, SubscriptionSchema } from '../modules/subscriptions/schemas/subscription.schema';
import { User, UserSchema } from '../modules/users/schemas/user.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/job_portal'),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Job.name, schema: JobSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
  ],
})
export class SeedModule {}

