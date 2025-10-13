import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: [{ type: 'ObjectId', ref: 'User' }], required: true })
  participants: string[];

  @Prop({ type: 'ObjectId', ref: 'Job' })
  job?: string;

  @Prop({ type: 'ObjectId', ref: 'Message' })
  lastMessage?: string;

  @Prop({ default: 0 })
  unreadCount: number;

  @Prop({ type: 'ObjectId', ref: 'User' })
  createdBy?: string;

  @Prop({ default: false })
  isAdminConversation: boolean;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ updatedAt: -1 });

