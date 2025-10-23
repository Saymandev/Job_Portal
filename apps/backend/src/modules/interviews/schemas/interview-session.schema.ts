import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InterviewSessionDocument = InterviewSession & Document;

export interface SessionQuestion {
  questionId: string;
  question: string;
  category: 'technical' | 'behavioral' | 'situational' | 'company-specific';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedAnswer: string;
  candidateAnswer?: string;
  interviewerNotes?: string;
  score?: number; // 1-10
  timeSpent?: number; // in minutes
  isCompleted: boolean;
}

export interface SessionFeedback {
  overallScore: number; // 1-10
  strengths: string[];
  areasForImprovement: string[];
  technicalSkills: number; // 1-10
  communicationSkills: number; // 1-10
  problemSolvingSkills: number; // 1-10
  culturalFit: number; // 1-10
  recommendation: 'hire' | 'no-hire' | 'maybe';
  additionalNotes?: string;
  submittedBy: string; // User ID
  submittedAt: Date;
}

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no-show',
}

@Schema({ timestamps: true })
export class InterviewSession {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  interviewerId: string;

  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  candidateId: string;

  @Prop({ type: 'ObjectId', ref: 'Job' })
  jobId?: string;

  @Prop({ type: 'ObjectId', ref: 'Application' })
  applicationId?: string;

  @Prop({ type: 'ObjectId', ref: 'InterviewTemplate' })
  templateId?: string;

  @Prop({ required: true, enum: SessionStatus, default: SessionStatus.SCHEDULED })
  status: SessionStatus;

  @Prop({ required: true })
  scheduledDate: Date;

  @Prop()
  actualStartDate?: Date;

  @Prop()
  actualEndDate?: Date;

  @Prop({ required: true })
  duration: number; // in minutes

  @Prop({ required: true })
  location: string; // 'in-person', 'video', 'phone', or specific address

  @Prop()
  meetingLink?: string; // For video interviews

  @Prop()
  meetingPassword?: string;

  @Prop({ type: [Object], default: [] })
  questions: SessionQuestion[];

  @Prop({ type: Object })
  feedback?: SessionFeedback;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object })
  metadata?: {
    interviewType?: string;
    difficulty?: string;
    skills?: string[];
    [key: string]: any;
  };

  @Prop({ default: false })
  isRecorded: boolean;

  @Prop()
  recordingUrl?: string;

  @Prop({ type: [String], default: [] })
  attendees: string[]; // Additional interviewer IDs

  @Prop()
  notes?: string; // General session notes

  @Prop({ default: 0 })
  totalScore: number;

  @Prop({ default: 0 })
  maxScore: number;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop()
  archivedAt?: Date;

  @Prop({ type: 'ObjectId', ref: 'User' })
  archivedBy?: string;
}

export const InterviewSessionSchema = SchemaFactory.createForClass(InterviewSession);
