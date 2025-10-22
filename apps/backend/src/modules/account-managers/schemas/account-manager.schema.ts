import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AccountManagerDocument = AccountManager & Document;

export enum AccountManagerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BUSY = 'busy',
  AWAY = 'away',
}

@Schema({ timestamps: true })
export class AccountManager {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  department: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, enum: AccountManagerStatus, default: AccountManagerStatus.ACTIVE })
  status: AccountManagerStatus;

  @Prop({ type: [String], default: [] })
  specializations: string[];

  @Prop({ default: 0 })
  maxClients: number;

  @Prop({ default: 0 })
  currentClients: number;

  @Prop({ type: [String], default: [] })
  assignedClients: string[];

  @Prop({ default: 0 })
  totalClients: number;

  @Prop({ default: 0 })
  averageResponseTime: number; // in minutes

  @Prop({ default: 0 })
  clientSatisfactionScore: number; // 1-5 scale

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  bio?: string;

  @Prop()
  profileImage?: string;

  @Prop({ type: [String], default: [] })
  languages: string[];

  @Prop({ default: new Date() })
  lastActiveAt: Date;

  @Prop({ type: Object, default: {} })
  workingHours: {
    timezone: string;
    monday: { start: string; end: string; enabled: boolean };
    tuesday: { start: string; end: string; enabled: boolean };
    wednesday: { start: string; end: string; enabled: boolean };
    thursday: { start: string; end: string; enabled: boolean };
    friday: { start: string; end: string; enabled: boolean };
    saturday: { start: string; end: string; enabled: boolean };
    sunday: { start: string; end: string; enabled: boolean };
  };

  @Prop({ type: [Object], default: [] })
  availability: Array<{
    date: Date;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }>;
}

export const AccountManagerSchema = SchemaFactory.createForClass(AccountManager);

AccountManagerSchema.index({ email: 1 });
AccountManagerSchema.index({ status: 1 });
AccountManagerSchema.index({ assignedClients: 1 });
AccountManagerSchema.index({ isActive: 1 });
