import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResumeParserModule } from '../resume-parser/resume-parser.module';
import { UploadModule } from '../upload/upload.module';
import { ResumeTemplate, ResumeTemplateSchema } from './schemas/resume-template.schema';
import { ResumeVersion, ResumeVersionSchema } from './schemas/resume-version.schema';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ResumeTemplate.name, schema: ResumeTemplateSchema },
      { name: ResumeVersion.name, schema: ResumeVersionSchema },
    ]),
    UploadModule,
    ResumeParserModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

