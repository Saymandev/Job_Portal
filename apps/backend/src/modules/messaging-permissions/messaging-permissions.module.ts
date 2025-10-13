import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagingPermissionsController } from './messaging-permissions.controller';
import { MessagingPermissionsService } from './messaging-permissions.service';
import { MessagingPermission, MessagingPermissionSchema } from './schemas/messaging-permission.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MessagingPermission.name, schema: MessagingPermissionSchema },
    ]),
  ],
  controllers: [MessagingPermissionsController],
  providers: [MessagingPermissionsService],
  exports: [MessagingPermissionsService],
})
export class MessagingPermissionsModule {}
