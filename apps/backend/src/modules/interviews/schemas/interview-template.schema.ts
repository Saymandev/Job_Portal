import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InterviewTemplateDocument = InterviewTemplate & Document;

export interface InterviewQuestion {
  question: string;
  category: 'technical' | 'behavioral' | 'situational' | 'company-specific';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedAnswer: string;
  tips: string[];
  timeLimit?: number; // in minutes
}

@Schema({ timestamps: true })
export class InterviewTemplate {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, type: [Object] })
  questions: InterviewQuestion[];

  @Prop({ required: true })
  duration: number; // in minutes

  @Prop({ required: true })
  industry: string;

  @Prop({ required: true })
  role: string;

  @Prop({ required: true })
  difficulty: 'easy' | 'medium' | 'hard';

  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  createdBy: string;

  @Prop({ default: false })
  isPublic: boolean;

  @Prop({ default: 0 })
  usageCount: number;

  @Prop({ default: 0 })
  averageRating: number;

  @Prop({ default: 0 })
  totalRatings: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object })
  metadata?: {
    companySize?: string;
    experienceLevel?: string;
    skills?: string[];
    [key: string]: any;
  };
}

export const InterviewTemplateSchema = SchemaFactory.createForClass(InterviewTemplate);
