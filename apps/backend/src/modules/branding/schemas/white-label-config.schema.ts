import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WhiteLabelConfigDocument = WhiteLabelConfig & Document;

@Schema({ timestamps: true })
export class WhiteLabelConfig {
  @Prop({ required: true, ref: 'User' })
  user: string;

  @Prop({ required: true })
  companyName: string;

  @Prop()
  logo?: string;

  @Prop()
  logoDark?: string;

  @Prop({ required: true })
  primaryColor: string;

  @Prop({ required: true })
  primaryColorDark: string;

  @Prop({ required: true })
  secondaryColor: string;

  @Prop({ required: true })
  secondaryColorDark: string;

  @Prop({ required: true })
  backgroundColor: string;

  @Prop({ required: true })
  backgroundColorDark: string;

  @Prop({ required: true })
  textColor: string;

  @Prop({ required: true })
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
  tagline?: string;

  @Prop({
    type: {
      website: String,
      linkedin: String,
      twitter: String,
      facebook: String,
      instagram: String,
    },
  })
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

  @Prop({
    type: {
      hidePoweredBy: { type: Boolean, default: false },
      customFavicon: String,
      customMetaTitle: String,
      customMetaDescription: String,
      customKeywords: [String],
      customRobotsTxt: String,
      customSitemap: String,
      customErrorPages: {
        '404': String,
        '500': String,
      },
      customEmailTemplates: {
        fromName: String,
        fromEmail: String,
        replyTo: String,
      },
      customLegalPages: {
        privacyPolicy: String,
        termsOfService: String,
        cookiePolicy: String,
      },
    },
    default: {},
  })
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

  @Prop()
  approvedAt?: Date;

  @Prop()
  rejectedAt?: Date;

  @Prop()
  rejectionReason?: string;

  @Prop()
  approvedBy?: string;

  @Prop()
  rejectedBy?: string;
}

export const WhiteLabelConfigSchema = SchemaFactory.createForClass(WhiteLabelConfig);
