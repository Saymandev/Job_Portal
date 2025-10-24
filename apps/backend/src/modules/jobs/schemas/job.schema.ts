import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type JobDocument = Job & Document & {
  createdAt: Date;
  updatedAt: Date;
};

export enum JobType {
  FULL_TIME = 'full-time',
  PART_TIME = 'part-time',
  CONTRACT = 'contract',
  INTERNSHIP = 'internship',
  FREELANCE = 'freelance',
}

export enum JobStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  DRAFT = 'draft',
  EXPIRED = 'expired',
}

export enum ExperienceLevel {
  ENTRY = 'entry',
  MID = 'mid',
  SENIOR = 'senior',
  LEAD = 'lead',
}

@Schema({ timestamps: true })
export class Job {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  requirements: string;

  @Prop({ type: 'ObjectId', ref: 'Company', required: true })
  company: string;

  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  postedBy: string;

  @Prop({ required: true })
  location: string;

  @Prop({ default: false })
  isRemote: boolean;

  @Prop({ required: true, enum: JobType })
  jobType: JobType;

  @Prop({ required: true, enum: ExperienceLevel })
  experienceLevel: ExperienceLevel;

  @Prop()
  salaryMin?: number;

  @Prop()
  salaryMax?: number;

  @Prop()
  currency?: string;

  @Prop({ type: [String] })
  skills: string[];

  @Prop({ type: [String] })
  benefits?: string[];

  @Prop({ required: true, enum: JobStatus, default: JobStatus.OPEN })
  status: JobStatus;

  @Prop()
  applicationDeadline?: Date;

  @Prop({ default: 0 })
  applicationsCount: number;

  @Prop({ default: 0 })
  viewsCount: number;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop()
  expiresAt?: Date;

  @Prop()
  companySize?: string;

  @Prop({ type: [String] })
  tags?: string[];

  @Prop({ type: Array })
  screeningQuestions?: Array<{
    question: string;
    type: 'text' | 'yes_no' | 'multiple_choice';
    required: boolean;
    options?: string[];
  }>;
}

export const JobSchema = SchemaFactory.createForClass(Job);

// Indexes for better query performance
JobSchema.index({ title: 'text', description: 'text', skills: 'text' });
JobSchema.index({ company: 1 });
JobSchema.index({ postedBy: 1 });
JobSchema.index({ status: 1 });
JobSchema.index({ location: 1 });
JobSchema.index({ jobType: 1 });
JobSchema.index({ experienceLevel: 1 });
JobSchema.index({ isRemote: 1 });
JobSchema.index({ salaryMin: 1 });
JobSchema.index({ salaryMax: 1 });
JobSchema.index({ isFeatured: -1, createdAt: -1 }); // Compound index for default sort
JobSchema.index({ createdAt: -1 }); // For date sorting
JobSchema.index({ 'company.name': 1 }); // For company sorting

