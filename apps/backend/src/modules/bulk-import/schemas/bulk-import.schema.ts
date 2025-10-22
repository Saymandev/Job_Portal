import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BulkImportDocument = BulkImport & Document;

export enum BulkImportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIALLY_COMPLETED = 'partially_completed',
}

@Schema({ timestamps: true, suppressReservedKeysWarning: true })
export class BulkImport {
  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  user: string;

  @Prop({ required: true })
  fileName: string;

  @Prop({ required: true })
  originalFileName: string;

  @Prop({ required: true })
  filePath: string;

  @Prop({ required: true, enum: BulkImportStatus, default: BulkImportStatus.PENDING })
  status: BulkImportStatus;

  @Prop({ default: 0 })
  totalJobs: number;

  @Prop({ default: 0 })
  processedJobs: number;

  @Prop({ default: 0 })
  successfulJobs: number;

  @Prop({ default: 0 })
  failedJobs: number;

  @Prop({ type: [Object], default: [] })
  errors: Array<{
    row: number;
    field: string;
    message: string;
    value?: any;
  }>;

  @Prop({ type: [Object], default: [] })
  successfulJobIds: string[];

  @Prop()
  completedAt?: Date;

  @Prop()
  errorMessage?: string;

  @Prop({ default: false })
  isActive: boolean;
}

export const BulkImportSchema = SchemaFactory.createForClass(BulkImport);

BulkImportSchema.index({ user: 1 });
BulkImportSchema.index({ status: 1 });
BulkImportSchema.index({ createdAt: -1 });
