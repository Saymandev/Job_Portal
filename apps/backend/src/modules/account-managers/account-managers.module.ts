import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AccountManagersController } from './account-managers.controller';
import { AccountManagersService } from './account-managers.service';
import { AccountManager, AccountManagerSchema } from './schemas/account-manager.schema';
import { ClientAssignment, ClientAssignmentSchema } from './schemas/client-assignment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AccountManager.name, schema: AccountManagerSchema },
      { name: ClientAssignment.name, schema: ClientAssignmentSchema },
    ]),
    SubscriptionsModule,
  ],
  controllers: [AccountManagersController],
  providers: [AccountManagersService],
  exports: [AccountManagersService],
})
export class AccountManagersModule {}
