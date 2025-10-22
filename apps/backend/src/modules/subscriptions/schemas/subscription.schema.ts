import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CANCELLED = 'cancelled',
  PAST_DUE = 'past_due',
}

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  user: string;

  @Prop({ required: true, enum: SubscriptionPlan, default: SubscriptionPlan.FREE })
  plan: SubscriptionPlan;

  @Prop({ required: true, enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @Prop()
  stripeCustomerId?: string;

  @Prop()
  stripeSubscriptionId?: string;

  @Prop()
  stripePriceId?: string;

  @Prop()
  currentPeriodStart?: Date;

  @Prop()
  currentPeriodEnd?: Date;

  @Prop({ default: 0 })
  jobPostsLimit: number;

  @Prop({ default: 0 })
  jobPostsUsed: number;

  @Prop({ default: false })
  autoRenew: boolean;

  @Prop({ default: 0 })
  boostsAvailable: number;

  @Prop({ default: 0 })
  boostsUsed: number;

  @Prop({ default: false })
  featuredJobsEnabled: boolean;

  @Prop({ default: false })
  prioritySupportEnabled: boolean;

  @Prop({ default: false })
  advancedAnalyticsEnabled: boolean;

  // Enhanced Employer (Job Holder) Features
  @Prop({ default: false })
  priorityApplicationsEnabled: boolean;

  @Prop({ default: false })
  enhancedMatchingEnabled: boolean;

  @Prop({ default: false })
  applicationAnalyticsEnabled: boolean;

  @Prop({ default: false })
  directMessagingEnabled: boolean;

  @Prop({ default: false })
  featuredProfileEnabled: boolean;

  @Prop({ default: false })
  unlimitedResumeDownloads: boolean;

  @Prop({ default: false })
  salaryInsightsEnabled: boolean;

  @Prop({ default: false })
  interviewPrepEnabled: boolean;

  @Prop({ default: 0 })
  applicationsLimit: number;

  @Prop({ default: 0 })
  applicationsUsed: number;

  // API Access Features
  @Prop({ default: false })
  apiAccessEnabled: boolean;

  @Prop({ default: 0 })
  maxApiKeys: number;

  @Prop({ default: 0 })
  apiRateLimitPerHour: number;

  // Custom Branding Features
  @Prop({ default: false })
  customBrandingEnabled: boolean;

  @Prop({ default: false })
  whiteLabelEnabled: boolean;

  // Bulk Operations
  @Prop({ default: false })
  bulkJobImportEnabled: boolean;

  @Prop({ default: 0 })
  maxBulkJobsPerImport: number;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ user: 1 });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ stripeCustomerId: 1 });

