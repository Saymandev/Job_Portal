import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { ContentFlag, ContentFlagSchema } from './schemas/content-flag.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContentFlag.name, schema: ContentFlagSchema },
    ]),
  ],
  providers: [ModerationService],
  controllers: [ModerationController],
  exports: [ModerationService],
})
export class ModerationModule {}
