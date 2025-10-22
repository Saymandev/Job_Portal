import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SupportTicketDocument = SupportTicket & Document;

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_FOR_CUSTOMER = 'waiting_for_customer',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical',
}

export enum TicketCategory {
  TECHNICAL = 'technical',
  BILLING = 'billing',
  FEATURE_REQUEST = 'feature_request',
  BUG_REPORT = 'bug_report',
  ACCOUNT = 'account',
  GENERAL = 'general',
}

@Schema({ timestamps: true })
export class SupportTicket {
  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  userId: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: TicketCategory })
  category: TicketCategory;

  @Prop({ required: true, enum: TicketPriority, default: TicketPriority.MEDIUM })
  priority: TicketPriority;

  @Prop({ required: true, enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Prop({ type: 'ObjectId', ref: 'User' })
  assignedTo?: string; // Support agent

  @Prop({ type: 'ObjectId', ref: 'AccountManager' })
  accountManagerId?: string; // For enterprise customers

  @Prop({ type: [Object], default: [] })
  messages: Array<{
    senderId: string;
    senderType: 'user' | 'agent' | 'system';
    message: string;
    timestamp: Date;
    isInternal: boolean;
    attachments?: Array<{
      filename: string;
      url: string;
      size: number;
      type: string;
    }>;
  }>;

  @Prop({ default: 0 })
  responseTime: number; // in minutes

  @Prop({ default: 0 })
  resolutionTime: number; // in minutes

  @Prop()
  resolvedAt?: Date;

  @Prop()
  closedAt?: Date;

  @Prop({ default: 0 })
  satisfactionScore: number; // 1-5 scale

  @Prop()
  satisfactionFeedback?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  isEscalated: boolean;

  @Prop()
  escalatedAt?: Date;

  @Prop()
  escalatedTo?: string;

  @Prop({ default: false })
  isActive: boolean;

  @Prop({ type: Object, default: {} })
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    source: 'web' | 'api' | 'email' | 'phone';
  };
}

export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);

SupportTicketSchema.index({ userId: 1 });
SupportTicketSchema.index({ status: 1 });
SupportTicketSchema.index({ priority: 1 });
SupportTicketSchema.index({ category: 1 });
SupportTicketSchema.index({ assignedTo: 1 });
SupportTicketSchema.index({ createdAt: -1 });
