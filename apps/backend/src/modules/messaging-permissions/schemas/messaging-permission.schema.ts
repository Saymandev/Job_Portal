import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessagingPermissionDocument = MessagingPermission & Document;

@Schema({ timestamps: true })
export class MessagingPermission {
  @Prop({ type: 'ObjectId', ref: 'User', required: true, index: true })
  user: string;

  @Prop({ type: 'ObjectId', ref: 'User', required: true, index: true })
  targetUser: string;

  @Prop({ 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'blocked'],
    default: 'pending',
    index: true
  })
  status: string;

  @Prop({ type: 'ObjectId', ref: 'Job' })
  relatedJob?: string;

  @Prop({ type: 'ObjectId', ref: 'Application' })
  relatedApplication?: string;

  @Prop()
  message?: string; // Optional message from requester

  @Prop()
  responseMessage?: string; // Optional response from target user

  @Prop({ default: Date.now })
  expiresAt?: Date; // Permission request expiration

  @Prop({ default: false })
  isActive: boolean; // Whether the permission is currently active

  @Prop({ default: Date.now, index: true })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const MessagingPermissionSchema = SchemaFactory.createForClass(MessagingPermission);

// Compound indexes for performance
MessagingPermissionSchema.index({ user: 1, targetUser: 1 }, { unique: true });
MessagingPermissionSchema.index({ targetUser: 1, status: 1 });
MessagingPermissionSchema.index({ user: 1, status: 1 });
MessagingPermissionSchema.index({ createdAt: -1 });
