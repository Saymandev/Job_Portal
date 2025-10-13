import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Job } from './job.schema';

export type SavedJobDocument = SavedJob & Document;

@Schema({ timestamps: true })
export class SavedJob {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ type: Types.ObjectId, ref: 'Job', required: true })
  jobId: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ type: Types.ObjectId, ref: 'Job' })
  job: Job;

  @Prop({ default: Date.now })
  savedAt: Date;

  @Prop({ default: true })
  isActive: boolean;

  // Metadata for recommendations
  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop()
  notes?: string;

  @Prop({ default: 0 })
  viewCount: number;
}

export const SavedJobSchema = SchemaFactory.createForClass(SavedJob);

// Compound index to ensure unique user-job combinations
SavedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });

// Indexes for better query performance
SavedJobSchema.index({ userId: 1, isActive: 1 });
SavedJobSchema.index({ savedAt: -1 });
SavedJobSchema.index({ jobId: 1 });
