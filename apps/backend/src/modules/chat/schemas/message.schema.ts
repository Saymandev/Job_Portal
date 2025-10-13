import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: 'ObjectId', ref: 'Conversation', required: true })
  conversation: string;

  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  sender: string;

  @Prop({ required: false })
  content?: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({
    type: {
      filename: { type: String },
      url: { type: String },
      mimetype: { type: String },
      size: { type: Number },
    },
    required: false,
  })
  attachment?: {
    filename: string;
    url: string;
    mimetype: string;
    size: number;
  };

  @Prop({ default: false })
  isAdminMessage: boolean;

  @Prop({ type: [{ type: 'ObjectId', ref: 'User' }], default: [] })
  readBy: string[];
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });

