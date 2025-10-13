import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ApplicationDocument = Application & Document & {
  createdAt: Date;
  updatedAt: Date;
};

export enum ApplicationStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  SHORTLISTED = 'shortlisted',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEWED = 'interviewed',
  REJECTED = 'rejected',
  ACCEPTED = 'accepted',
}

@Schema({ timestamps: true })
export class Application {
  @Prop({ type: 'ObjectId', ref: 'Job', required: true })
  job: string;

  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  applicant: string;

  @Prop({ type: 'ObjectId', ref: 'Company', required: true })
  company: string;

  @Prop({ required: true, enum: ApplicationStatus, default: ApplicationStatus.PENDING })
  status: ApplicationStatus;

  @Prop({ required: true })
  resume: string;

  @Prop()
  coverLetter?: string;

  @Prop()
  portfolio?: string;

  @Prop()
  interviewDate?: Date;

  @Prop()
  notes?: string;

  @Prop()
  feedback?: string;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);

// Indexes
ApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
ApplicationSchema.index({ applicant: 1 });
ApplicationSchema.index({ company: 1 });
ApplicationSchema.index({ status: 1 });
ApplicationSchema.index({ createdAt: -1 });

