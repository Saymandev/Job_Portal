import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CoverLetterTemplateDocument = CoverLetterTemplate & Document;

@Schema({ timestamps: true })
export class CoverLetterTemplate {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ default: 0 })
  usageCount: number;

  @Prop()
  lastUsedAt?: Date;
}

export const CoverLetterTemplateSchema = SchemaFactory.createForClass(CoverLetterTemplate);

// Indexes for better query performance
CoverLetterTemplateSchema.index({ userId: 1, isDefault: 1 });
CoverLetterTemplateSchema.index({ userId: 1, usageCount: -1 });
