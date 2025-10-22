import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { Branding, BrandingDocument } from './schemas/branding.schema';

@Injectable()
export class BrandingService {
  constructor(
    @InjectModel(Branding.name) private brandingModel: Model<BrandingDocument>,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async getBranding(userId: string): Promise<Branding | null> {
    return this.brandingModel.findOne({ user: userId });
  }

  async createOrUpdateBranding(userId: string, brandingData: Partial<Branding>): Promise<Branding> {
    // Check if user has branding access
    const subscription = await this.subscriptionsService.getUserSubscription(userId);
    if (!subscription || !this.hasBrandingAccess(subscription.plan)) {
      throw new BadRequestException('Custom branding requires Pro or Enterprise subscription');
    }

    // Check for white-label features
    if (brandingData.whiteLabelEnabled && !this.hasWhiteLabelAccess(subscription.plan)) {
      throw new BadRequestException('White-label features require Enterprise subscription');
    }

    const existingBranding = await this.brandingModel.findOne({ user: userId });

    if (existingBranding) {
      Object.assign(existingBranding, brandingData);
      return existingBranding.save();
    } else {
      const newBranding = new this.brandingModel({
        user: userId,
        ...brandingData,
      });
      return newBranding.save();
    }
  }

  async updateBranding(userId: string, brandingData: Partial<Branding>): Promise<Branding> {
    const branding = await this.brandingModel.findOne({ user: userId });
    
    if (!branding) {
      throw new NotFoundException('Branding not found');
    }

    // Check subscription limits
    const subscription = await this.subscriptionsService.getUserSubscription(userId);
    if (!subscription || !this.hasBrandingAccess(subscription.plan)) {
      throw new BadRequestException('Custom branding requires Pro or Enterprise subscription');
    }

    if (brandingData.whiteLabelEnabled && !this.hasWhiteLabelAccess(subscription.plan)) {
      throw new BadRequestException('White-label features require Enterprise subscription');
    }

    Object.assign(branding, brandingData);
    return branding.save();
  }

  async deleteBranding(userId: string): Promise<void> {
    await this.brandingModel.findOneAndDelete({ user: userId });
  }

  async getBrandingByDomain(domain: string): Promise<Branding | null> {
    return this.brandingModel.findOne({ customDomain: domain, isActive: true });
  }

  async activateBranding(userId: string): Promise<Branding> {
    const branding = await this.brandingModel.findOne({ user: userId });
    
    if (!branding) {
      throw new NotFoundException('Branding not found');
    }

    branding.isActive = true;
    return branding.save();
  }

  async deactivateBranding(userId: string): Promise<Branding> {
    const branding = await this.brandingModel.findOne({ user: userId });
    
    if (!branding) {
      throw new NotFoundException('Branding not found');
    }

    branding.isActive = false;
    return branding.save();
  }

  async validateCustomDomain(domain: string): Promise<boolean> {
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    return domainRegex.test(domain);
  }

  async checkDomainAvailability(domain: string): Promise<boolean> {
    const existing = await this.brandingModel.findOne({ customDomain: domain });
    return !existing;
  }

  private hasBrandingAccess(plan: string): boolean {
    return ['pro', 'enterprise'].includes(plan);
  }

  private hasWhiteLabelAccess(plan: string): boolean {
    return plan === 'enterprise';
  }

  async getWhiteLabelSettings(userId: string): Promise<any> {
    const branding = await this.getBranding(userId);
    if (!branding) {
      throw new NotFoundException('Branding not found');
    }

    return {
      whiteLabelEnabled: branding.whiteLabelEnabled,
      removeJobPortalBranding: branding.removeJobPortalBranding,
      customDomain: branding.customDomain,
      customFooterText: branding.customFooterText,
      customHeaderText: branding.customHeaderText,
      whiteLabelSettings: branding.whiteLabelSettings,
    };
  }

  async updateWhiteLabelSettings(userId: string, settings: any): Promise<Branding> {
    const subscription = await this.subscriptionsService.getUserSubscription(userId);
    if (!subscription || !this.hasWhiteLabelAccess(subscription.plan)) {
      throw new BadRequestException('White-label features require Enterprise subscription');
    }

    return this.updateBranding(userId, {
      whiteLabelEnabled: settings.whiteLabelEnabled,
      removeJobPortalBranding: settings.removeJobPortalBranding,
      customDomain: settings.customDomain,
      customFooterText: settings.customFooterText,
      customHeaderText: settings.customHeaderText,
      whiteLabelSettings: settings.whiteLabelSettings,
    });
  }

  async generateWhiteLabelAssets(branding: Branding): Promise<any> {
    const assets = {
      customCss: this.generateBrandingCss(branding),
      metaTags: {
        title: branding.whiteLabelSettings?.customMetaTitle || branding.companyName || 'Job Board',
        description: branding.whiteLabelSettings?.customMetaDescription || branding.tagline || 'Find your next career opportunity',
        keywords: branding.whiteLabelSettings?.customKeywords || ['jobs', 'careers', 'employment'],
        favicon: branding.whiteLabelSettings?.customFavicon || branding.favicon,
      },
      errorPages: branding.whiteLabelSettings?.customErrorPages || {},
      emailTemplates: branding.whiteLabelSettings?.customEmailTemplates || {},
      legalPages: branding.whiteLabelSettings?.customLegalPages || {},
      robotsTxt: branding.whiteLabelSettings?.customRobotsTxt || 'User-agent: *\nAllow: /',
      sitemap: branding.whiteLabelSettings?.customSitemap || '',
    };

    return assets;
  }

  async generateBrandingCss(branding: Branding): Promise<string> {
    const css = `
      :root {
        --brand-primary: ${branding.primaryColor};
        --brand-primary-dark: ${branding.primaryColorDark};
        --brand-secondary: ${branding.secondaryColor};
        --brand-secondary-dark: ${branding.secondaryColorDark};
        --brand-background: ${branding.backgroundColor};
        --brand-background-dark: ${branding.backgroundColorDark};
        --brand-text: ${branding.textColor};
        --brand-text-dark: ${branding.textColorDark};
      }

      .branded-job-listing {
        --tw-bg-opacity: 1;
        background-color: var(--brand-background);
        color: var(--brand-text);
      }

      .branded-job-listing .job-title {
        color: var(--brand-primary);
      }

      .branded-job-listing .company-name {
        color: var(--brand-secondary);
      }

      .branded-job-listing .apply-button {
        background-color: var(--brand-primary);
        color: white;
      }

      .branded-job-listing .apply-button:hover {
        background-color: var(--brand-primary-dark);
      }

      .branded-company-page {
        --tw-bg-opacity: 1;
        background-color: var(--brand-background);
        color: var(--brand-text);
      }

      .branded-company-page .company-header {
        background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
      }

      .branded-company-page .company-logo {
        border: 3px solid var(--brand-primary);
        border-radius: 8px;
      }

      ${branding.customCss || ''}
    `;

    return css.trim();
  }
}
