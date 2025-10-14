import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BlockedIpDocument = BlockedIp & Document;

export enum BlockType {
  MANUAL = 'manual',
  AUTOMATIC = 'automatic',
  RATE_LIMIT = 'rate_limit',
  FRAUD_DETECTION = 'fraud_detection',
}

export enum BlockReason {
  SPAM = 'spam',
  FRAUD = 'fraud',
  ABUSE = 'abuse',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  MULTIPLE_FAILED_LOGINS = 'multiple_failed_logins',
  MALICIOUS_UPLOADS = 'malicious_uploads',
  ADMIN_DECISION = 'admin_decision',
}

@Schema({ timestamps: true })
export class BlockedIp {
  @Prop({ required: true, unique: true })
  ipAddress: string;

  @Prop({ required: true, enum: BlockType })
  blockType: BlockType;

  @Prop({ required: true, enum: BlockReason })
  reason: BlockReason;

  @Prop()
  description?: string;

  @Prop({ required: true })
  blockedBy: string; // User ID or 'system'

  @Prop({ default: false })
  isActive: boolean;

  @Prop()
  expiresAt?: Date;

  @Prop({ default: 0 })
  violationCount: number;

  @Prop({ type: Object })
  metadata?: {
    userAgent?: string;
    country?: string;
    city?: string;
    isp?: string;
    lastSeen?: Date;
    firstSeen?: Date;
    relatedUserIds?: string[];
    suspiciousActivities?: string[];
  };

  @Prop()
  unblockedAt?: Date;

  @Prop()
  unblockedBy?: string;

  @Prop()
  unblockReason?: string;
}

export const BlockedIpSchema = SchemaFactory.createForClass(BlockedIp);

// Indexes for performance
BlockedIpSchema.index({ ipAddress: 1, isActive: 1 });
BlockedIpSchema.index({ blockType: 1 });
BlockedIpSchema.index({ reason: 1 });
BlockedIpSchema.index({ expiresAt: 1 });
BlockedIpSchema.index({ createdAt: -1 });
