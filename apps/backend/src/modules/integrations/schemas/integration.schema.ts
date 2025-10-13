import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type IntegrationDocument = Integration & Document & {
  createdAt: Date;
  updatedAt: Date;
};

export enum IntegrationType {
  GOOGLE_CALENDAR = 'google_calendar',
  LINKEDIN = 'linkedin',
  SLACK = 'slack',
  ATS = 'ats',
  ZAPIER = 'zapier',
  GREENHOUSE = 'greenhouse',
  LEVER = 'lever',
}

export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  PENDING = 'pending',
}

@Schema({ timestamps: true })
export class Integration {
  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  userId: string;

  @Prop({ type: 'ObjectId', ref: 'Company' })
  companyId?: string;

  @Prop({ required: true, enum: IntegrationType })
  type: IntegrationType;

  @Prop({ required: true, enum: IntegrationStatus, default: IntegrationStatus.PENDING })
  status: IntegrationStatus;

  @Prop({ type: Object })
  credentials?: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
    apiKey?: string;
    webhookUrl?: string;
  };

  @Prop({ type: Object, default: {} })
  settings?: {
    syncCalendar?: boolean;
    syncApplications?: boolean;
    notifyOnSlack?: boolean;
    autoPostJobs?: boolean;
    importCandidates?: boolean;
  };

  @Prop()
  lastSyncedAt?: Date;

  @Prop()
  errorMessage?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const IntegrationSchema = SchemaFactory.createForClass(Integration);

// Indexes
IntegrationSchema.index({ userId: 1, type: 1 });
IntegrationSchema.index({ companyId: 1 });
IntegrationSchema.index({ status: 1 });
