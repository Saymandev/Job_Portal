import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Company, CompanySchema } from '../modules/companies/schemas/company.schema';
import { Job, JobSchema } from '../modules/jobs/schemas/job.schema';
import { Subscription, SubscriptionSchema } from '../modules/subscriptions/schemas/subscription.schema';
import { User, UserSchema } from '../modules/users/schemas/user.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/backend/.env'],
      validate: (config: Record<string, any>) => {
        const requiredKeys = ['MONGODB_URI'];
        const missingKeys = requiredKeys.filter(
          (key) => !config[key] || String(config[key]).trim() === '',
        );
        if (missingKeys.length > 0) {
          throw new Error(
            `Missing required environment variables: ${missingKeys.join(', ')}`,
          );
        }
        return config;
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Job.name, schema: JobSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
  ],
})
export class SeedModule {}

