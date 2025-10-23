import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContentFlagDocument = ContentFlag & Document;

export enum FlagType {
  JOB = 'job',
  USER = 'user',
  APPLICATION = 'application',
  MESSAGE = 'message',
  COMPANY = 'company',
}

export enum FlagPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum FlagStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
  ESCALATED = 'escalated',
}

export enum FlagReason {
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  SPAM = 'spam',
  FAKE_PROFILE = 'fake_profile',
  HARASSMENT = 'harassment',
  DISCRIMINATION = 'discrimination',
  COPYRIGHT_VIOLATION = 'copyright_violation',
  PRIVACY_VIOLATION = 'privacy_violation',
  FRAUD = 'fraud',
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class ContentFlag {
  @Prop({ required: true, enum: FlagType })
  type: FlagType;

  @Prop({ required: true })
  targetId: string;

  @Prop({ required: true })
  targetTitle: string;

  @Prop({ required: true, ref: 'User' })
  reporter: string;

  @Prop({ required: true, enum: FlagReason })
  reason: FlagReason;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: FlagStatus, default: FlagStatus.PENDING })
  status: FlagStatus;

  @Prop({ required: true, enum: FlagPriority, default: FlagPriority.MEDIUM })
  priority: FlagPriority;

  @Prop({ ref: 'User' })
  reviewedBy?: string;

  @Prop()
  reviewedAt?: Date;

  @Prop()
  resolution?: string;

  @Prop()
  escalatedTo?: string;

  @Prop()
  escalatedAt?: Date;

  @Prop()
  escalatedReason?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: 0 })
  reportCount: number;

  @Prop({ type: [{ type: String, ref: 'User' }], default: [] })
  additionalReporters: string[];
}

export const ContentFlagSchema = SchemaFactory.createForClass(ContentFlag);
