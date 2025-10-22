import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobsModule } from '../jobs/jobs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { BulkImportController } from './bulk-import.controller';
import { BulkImportService } from './bulk-import.service';
import { BulkImport, BulkImportSchema } from './schemas/bulk-import.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BulkImport.name, schema: BulkImportSchema }]),
    JobsModule,
    NotificationsModule,
    SubscriptionsModule,
  ],
  controllers: [BulkImportController],
  providers: [BulkImportService],
  exports: [BulkImportService],
})
export class BulkImportModule {}
