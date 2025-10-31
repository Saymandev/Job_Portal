import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ResumeTemplateDocument = ResumeTemplate & Document & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class ResumeTemplate {
  @Prop({ required: true, unique: true })
  key: string; // e.g., "classic", "modern", "elegant"

  @Prop({ required: true })
  name: string; // Display name

  @Prop({ default: 'light' })
  defaultTheme?: string; // default theme variant for the template

  @Prop({ type: Object, default: {} })
  config?: Record<string, any>; // layout config, typography, spacing, etc.

  @Prop({ type: [String], default: [] })
  allowedThemes?: string[]; // e.g., ["light", "dark", "blue"]

  @Prop({ default: true })
  isActive?: boolean;
}

export const ResumeTemplateSchema = SchemaFactory.createForClass(ResumeTemplate);


