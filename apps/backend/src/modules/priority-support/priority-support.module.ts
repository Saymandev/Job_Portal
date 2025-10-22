import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PrioritySupportController } from './priority-support.controller';
import { PrioritySupportService } from './priority-support.service';
import { SupportTicket, SupportTicketSchema } from './schemas/support-ticket.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SupportTicket.name, schema: SupportTicketSchema }]),
    NotificationsModule,
    SubscriptionsModule,
  ],
  controllers: [PrioritySupportController],
  providers: [PrioritySupportService],
  exports: [PrioritySupportService],
})
export class PrioritySupportModule {}
