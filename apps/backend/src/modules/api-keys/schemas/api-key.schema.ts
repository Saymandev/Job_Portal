import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ApiKeyDocument = ApiKey & Document;

export enum ApiKeyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  REVOKED = 'revoked',
}

@Schema({ timestamps: true })
export class ApiKey {
  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  user: string;

  @Prop({ required: true, unique: true })
  keyId: string;

  @Prop({ required: true })
  hashedKey: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ApiKeyStatus, default: ApiKeyStatus.ACTIVE })
  status: ApiKeyStatus;

  @Prop({ default: Date.now })
  lastUsed?: Date;

  @Prop({ default: 0 })
  usageCount: number;

  @Prop()
  expiresAt?: Date;

  @Prop({ default: [] })
  permissions: string[];

  @Prop({ default: 1000 })
  rateLimitPerHour: number;

  @Prop({ default: 0 })
  currentHourUsage: number;

  @Prop()
  lastResetHour?: Date;
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);

ApiKeySchema.index({ user: 1 });
ApiKeySchema.index({ status: 1 });
ApiKeySchema.index({ expiresAt: 1 });
