import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InterviewDocument = Interview & Document & {
  createdAt: Date;
  updatedAt: Date;
};

export enum InterviewStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  RESCHEDULED = 'rescheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum InterviewType {
  PHONE = 'phone',
  VIDEO = 'video',
  IN_PERSON = 'in_person',
  TECHNICAL = 'technical',
  BEHAVIORAL = 'behavioral',
}

@Schema({ timestamps: true })
export class Interview {
  @Prop({ type: 'ObjectId', ref: 'Application', required: true })
  application: string;

  @Prop({ type: 'ObjectId', ref: 'Job', required: true })
  job: string;

  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  candidate: string;

  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  interviewer: string;

  @Prop({ type: 'ObjectId', ref: 'Company', required: true })
  company: string;

  @Prop({ required: true })
  scheduledDate: Date;

  @Prop({ required: true })
  duration: number; // in minutes

  @Prop({ required: true, enum: InterviewType })
  type: InterviewType;

  @Prop({ required: true, enum: InterviewStatus, default: InterviewStatus.SCHEDULED })
  status: InterviewStatus;

  @Prop()
  location?: string;

  @Prop()
  meetingLink?: string;

  @Prop()
  notes?: string;

  @Prop()
  feedback?: string;

  @Prop({ type: [String] })
  attendees?: string[];

  @Prop()
  reminderSent?: boolean;

  @Prop()
  cancelReason?: string;

  // Reschedule request fields
  @Prop({ default: false })
  rescheduleRequested: boolean;

  @Prop()
  rescheduleReason?: string;

  @Prop()
  requestedNewDate?: Date;

  @Prop({ default: 0 })
  rescheduleRequestCount: number; // Track how many times reschedule was requested

  @Prop()
  rescheduleRequestedAt?: Date;

  @Prop({ default: false })
  rescheduleApproved: boolean;

  @Prop()
  rescheduleApprovedAt?: Date;
}

export const InterviewSchema = SchemaFactory.createForClass(Interview);

// Indexes
InterviewSchema.index({ candidate: 1, scheduledDate: 1 });
InterviewSchema.index({ interviewer: 1, scheduledDate: 1 });
InterviewSchema.index({ application: 1 });
InterviewSchema.index({ status: 1 });
InterviewSchema.index({ scheduledDate: 1 });
