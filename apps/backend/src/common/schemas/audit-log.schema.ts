import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AuditAction, AuditResource } from '../interfaces/audit-log.interface';

export type AuditLogDocument = AuditLog & Document;

// Re-export enums for easier importing
export { AuditAction, AuditResource };

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  userId: string;

  @Prop({ required: true, enum: Object.values(AuditAction) })
  action: AuditAction;

  @Prop({ required: true, enum: Object.values(AuditResource) })
  resource: AuditResource;

  @Prop({ required: true })
  resourceId: string;

  @Prop({ type: Object, default: {} })
  details: Record<string, any>;

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ required: true })
  userAgent: string;

  @Prop({ default: true })
  success: boolean;

  @Prop()
  errorMessage?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Indexes for performance
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1 });
AuditLogSchema.index({ timestamp: -1 });
