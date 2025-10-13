import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: 'ObjectId', ref: 'User', required: true, index: true })
  user: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ 
    type: String, 
    enum: ['info', 'success', 'warning', 'error', 'application', 'interview', 'message', 'system'],
    default: 'info',
    index: true
  })
  type: string;

  @Prop({ default: false, index: true })
  isRead: boolean;

  @Prop({ type: 'ObjectId', ref: 'Job' })
  job?: string;

  @Prop({ type: 'ObjectId', ref: 'Application' })
  application?: string;

  @Prop({ type: 'ObjectId', ref: 'Conversation' })
  conversation?: string;

  @Prop()
  actionUrl?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now, index: true })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes for performance
NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, type: 1 });
NotificationSchema.index({ createdAt: -1 });
