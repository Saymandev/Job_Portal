import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ClientAssignmentDocument = ClientAssignment & Document;

export enum AssignmentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TRANSFERRED = 'transferred',
  COMPLETED = 'completed',
}

@Schema({ timestamps: true })
export class ClientAssignment {
  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  clientId: string;

  @Prop({ type: 'ObjectId', ref: 'AccountManager', required: true })
  accountManagerId: string;

  @Prop({ required: true, enum: AssignmentStatus, default: AssignmentStatus.ACTIVE })
  status: AssignmentStatus;

  @Prop({ required: true })
  assignedAt: Date;

  @Prop()
  assignedBy: string; // Admin who made the assignment

  @Prop()
  transferredAt?: Date;

  @Prop()
  transferredTo?: string; // New account manager ID

  @Prop()
  completedAt?: Date;

  @Prop({ default: '' })
  notes: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: 0 })
  priority: number; // 1-5 scale, 5 being highest

  @Prop({ type: Object, default: {} })
  preferences: {
    communicationMethod: 'email' | 'phone' | 'video' | 'chat';
    preferredTime: string;
    timezone: string;
    language: string;
  };

  @Prop({ type: [Object], default: [] })
  interactions: Array<{
    date: Date;
    type: 'call' | 'email' | 'meeting' | 'chat' | 'note';
    summary: string;
    duration?: number; // in minutes
    outcome: string;
  }>;

  @Prop({ default: 0 })
  totalInteractions: number;

  @Prop({ default: 0 })
  lastInteractionAt: Date;

  @Prop({ default: 0 })
  clientSatisfactionScore: number; // 1-5 scale

  @Prop({ default: true })
  isActive: boolean;
}

export const ClientAssignmentSchema = SchemaFactory.createForClass(ClientAssignment);

ClientAssignmentSchema.index({ clientId: 1 });
ClientAssignmentSchema.index({ accountManagerId: 1 });
ClientAssignmentSchema.index({ status: 1 });
ClientAssignmentSchema.index({ assignedAt: -1 });
