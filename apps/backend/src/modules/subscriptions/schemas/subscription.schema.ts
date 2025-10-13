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
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

SubscriptionSchema.index({ user: 1 });
SubscriptionSchema.index({ status: 1 });
SubscriptionSchema.index({ stripeCustomerId: 1 });

