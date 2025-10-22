import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BrandingDocument = Branding & Document;

@Schema({ timestamps: true })
export class Branding {
  @Prop({ type: 'ObjectId', ref: 'User', required: true, unique: true })
  user: string;

  @Prop()
  logo?: string;

  @Prop()
  logoDark?: string;

  @Prop({ default: '#3B82F6' })
  primaryColor: string;

  @Prop({ default: '#1E40AF' })
  primaryColorDark: string;

  @Prop({ default: '#F3F4F6' })
  secondaryColor: string;

  @Prop({ default: '#374151' })
  secondaryColorDark: string;

  @Prop({ default: '#FFFFFF' })
  backgroundColor: string;

  @Prop({ default: '#111827' })
  backgroundColorDark: string;

  @Prop({ default: '#6B7280' })
  textColor: string;

  @Prop({ default: '#F9FAFB' })
  textColorDark: string;

  @Prop()
  customCss?: string;

  @Prop()
  favicon?: string;

  @Prop({ default: false })
  isActive: boolean;

  @Prop()
  customDomain?: string;

  @Prop({ default: false })
  whiteLabelEnabled: boolean;

  @Prop()
  companyName?: string;

  @Prop()
  tagline?: string;

  @Prop()
  socialLinks?: {
    website?: string;
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };

  @Prop({ default: false })
  removeJobPortalBranding: boolean;

  @Prop()
  customFooterText?: string;

  @Prop()
  customHeaderText?: string;

  @Prop({ type: Object, default: {} })
  whiteLabelSettings: {
    hidePoweredBy: boolean;
    customFavicon?: string;
    customMetaTitle?: string;
    customMetaDescription?: string;
    customKeywords?: string[];
    customRobotsTxt?: string;
    customSitemap?: string;
    customErrorPages?: {
      '404': string;
      '500': string;
    };
    customEmailTemplates?: {
      fromName: string;
      fromEmail: string;
      replyTo: string;
    };
    customLegalPages?: {
      privacyPolicy?: string;
      termsOfService?: string;
      cookiePolicy?: string;
    };
  };
}

export const BrandingSchema = SchemaFactory.createForClass(Branding);

BrandingSchema.index({ user: 1 });
BrandingSchema.index({ customDomain: 1 });
