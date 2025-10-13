import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CompanyDocument = Company & Document;

@Schema({ timestamps: true })
export class Company {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  website?: string;

  @Prop()
  industry?: string;

  @Prop()
  companySize?: string;

  @Prop()
  location?: string;

  @Prop()
  logo?: string;

  @Prop()
  coverImage?: string;

  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  owner: string;

  @Prop({ type: [{ type: 'ObjectId', ref: 'User' }] })
  employees: string[];

  @Prop()
  linkedinUrl?: string;

  @Prop()
  twitterUrl?: string;

  @Prop()
  facebookUrl?: string;

  @Prop({ default: true })
  isVerified: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

CompanySchema.index({ name: 1 });
CompanySchema.index({ owner: 1 });
CompanySchema.index({ isActive: 1 });

