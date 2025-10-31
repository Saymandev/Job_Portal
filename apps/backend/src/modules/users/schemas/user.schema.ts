import { Role } from '@/common/decorators/roles.decorator';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, enum: Role, default: Role.JOB_SEEKER })
  role: Role;

  @Prop()
  phone?: string;

  @Prop()
  avatar?: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  emailVerificationExpires?: Date;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  @Prop()
  lastLogin?: Date;

  // Job Seeker specific fields
  @Prop()
  resume?: string;

  @Prop()
  skills?: string[];

  @Prop()
  experience?: string;

  @Prop()
  education?: string;

  @Prop()
  location?: string;

  @Prop()
  bio?: string;

  @Prop()
  portfolioUrl?: string;

  @Prop()
  linkedinUrl?: string;

  @Prop()
  githubUrl?: string;

  @Prop()
  website?: string;

  @Prop()
  professionalTitle?: string;

  // CV Builder fields
  @Prop({ type: Object })
  resumeFile?: {
    filename: string;
    url: string;
    uploadedAt: Date;
  };

  @Prop({ type: Array, default: [] })
  cvSkills?: Array<{
    id: string;
    name: string;
    level: string;
    category: string;
  }>;

  @Prop({ type: Array, default: [] })
  cvExperience?: Array<{
    id: string;
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description: string;
    achievements: string[];
  }>;

  @Prop({ type: Array, default: [] })
  cvEducation?: Array<{
    id: string;
    degree: string;
    institution: string;
    location: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    gpa?: string;
    description?: string;
  }>;

  @Prop({ type: Array, default: [] })
  certifications?: Array<{
    id: string;
    name: string;
    issuer: string;
    date: string;
    expiryDate?: string;
    credentialId?: string;
    url?: string;
  }>;

  @Prop({ type: Array, default: [] })
  projects?: Array<{
    id: string;
    name: string;
    description: string;
    technologies: string[];
    url?: string;
    githubUrl?: string;
    startDate?: string;
    endDate?: string;
  }>;

  @Prop({ type: Array, default: [] })
  languages?: Array<{
    id: string;
    language: string;
    proficiency: string;
  }>;

  // Employer specific fields (reference to company)
  @Prop({ type: 'ObjectId', ref: 'Company' })
  company?: string;

  // Notification Preferences
  @Prop({ type: Object, default: () => ({
    emailNotifications: true,
    pushNotifications: false,
    newJobMatches: true,
    applicationUpdates: true,
    messages: true,
    weeklyDigest: false,
  })})
  notificationPreferences?: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    newJobMatches: boolean;
    applicationUpdates: boolean;
    messages: boolean;
    weeklyDigest: boolean;
  };

  // Push Notification Subscription
  @Prop({ type: Object })
  pushSubscription?: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };

  // Profile View Tracking
  @Prop({ default: 0 })
  profileViews: number;

  @Prop({ type: Array, default: [] })
  profileViewers: Array<{
    viewerId: string;
    viewedAt: Date;
    viewerRole: string;
  }>;

  // Resume Builder - versions linkage
  @Prop({ type: [{ type: 'ObjectId', ref: 'ResumeVersion' }], default: [] })
  resumeVersions?: Types.ObjectId[];

  @Prop({ type: 'ObjectId', ref: 'ResumeVersion' })
  defaultResumeVersion?: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes for better query performance
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

