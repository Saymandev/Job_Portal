import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { BrandingController } from './branding.controller';
import { BrandingService } from './branding.service';
import { Branding, BrandingSchema } from './schemas/branding.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Branding.name, schema: BrandingSchema }]),
    NotificationsModule,
    SubscriptionsModule,
  ],
  controllers: [BrandingController],
  providers: [BrandingService],
  exports: [BrandingService],
})
export class BrandingModule {}
