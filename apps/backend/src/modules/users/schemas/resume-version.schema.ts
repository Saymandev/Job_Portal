import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ResumeVersionDocument = ResumeVersion & Document & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class ResumeVersion {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  name: string; // e.g., "General", "For Frontend Roles", "Data Science v2"

  @Prop({ type: Types.ObjectId, ref: 'ResumeTemplate', required: true })
  template: Types.ObjectId;

  @Prop({ default: 'light' })
  theme?: string;

  @Prop({ type: Object, default: {} })
  sections?: Record<string, any>; // normalized CV data used for rendering

  @Prop({ default: false })
  isDefault?: boolean;
}

export const ResumeVersionSchema = SchemaFactory.createForClass(ResumeVersion);


