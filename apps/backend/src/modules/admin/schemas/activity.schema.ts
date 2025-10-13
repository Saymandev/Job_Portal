import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ActivityDocument = Activity & Document & {
  createdAt: Date;
  updatedAt: Date;
};

export enum ActivityType {
  USER_REGISTRATION = 'user_registration',
  USER_LOGIN = 'user_login',
  JOB_POSTED = 'job_posted',
  JOB_APPROVED = 'job_approved',
  JOB_REJECTED = 'job_rejected',
  APPLICATION_SUBMITTED = 'application_submitted',
  APPLICATION_REVIEWED = 'application_reviewed',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  USER_BLOCKED = 'user_blocked',
  USER_UNBLOCKED = 'user_unblocked',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  PROFILE_UPDATED = 'profile_updated',
  PASSWORD_CHANGED = 'password_changed',
}

@Schema({ timestamps: true })
export class Activity {
  @Prop({ required: true, enum: ActivityType })
  type: ActivityType;

  @Prop({ required: true })
  description: string;

  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  userId: string;

  @Prop({ type: 'ObjectId', ref: 'User', required: false })
  targetUserId?: string;

  @Prop({ type: 'ObjectId', ref: 'Job', required: false })
  jobId?: string;

  @Prop({ type: 'ObjectId', ref: 'Application', required: false })
  applicationId?: string;

  @Prop({ type: 'ObjectId', ref: 'Company', required: false })
  companyId?: string;

  @Prop({ type: Object, required: false })
  metadata?: any;

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ required: true })
  userAgent: string;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);

// Indexes for better query performance
ActivitySchema.index({ type: 1 });
ActivitySchema.index({ userId: 1 });
ActivitySchema.index({ createdAt: -1 });
ActivitySchema.index({ type: 1, createdAt: -1 });
