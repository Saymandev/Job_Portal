import { IsBoolean, IsHexColor, IsObject, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateBrandingDto {
  @IsOptional()
  @IsUrl()
  logo?: string;

  @IsOptional()
  @IsUrl()
  logoDark?: string;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsHexColor()
  primaryColorDark?: string;

  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @IsOptional()
  @IsHexColor()
  secondaryColorDark?: string;

  @IsOptional()
  @IsHexColor()
  backgroundColor?: string;

  @IsOptional()
  @IsHexColor()
  backgroundColorDark?: string;

  @IsOptional()
  @IsHexColor()
  textColor?: string;

  @IsOptional()
  @IsHexColor()
  textColorDark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  customCss?: string;

  @IsOptional()
  @IsUrl()
  favicon?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customDomain?: string;

  @IsOptional()
  @IsBoolean()
  whiteLabelEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string;

  @IsOptional()
  @IsObject()
  socialLinks?: {
    website?: string;
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };

  @IsOptional()
  @IsBoolean()
  removeJobPortalBranding?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  customFooterText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  customHeaderText?: string;

  @IsOptional()
  @IsObject()
  whiteLabelSettings?: {
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
