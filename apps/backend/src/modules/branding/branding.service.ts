import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { Branding, BrandingDocument } from './schemas/branding.schema';

@Injectable()
export class BrandingService {
  constructor(
    @InjectModel(Branding.name) private brandingModel: Model<BrandingDocument>,
    private subscriptionsService: SubscriptionsService,
    private notificationsService: NotificationsService,
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
      const updatedBranding = await existingBranding.save();
      
      // Send notification about branding update
      await this.notificationsService.createNotification({
        user: userId,
        title: '🎨 Branding Updated',
        message: 'Your company branding settings have been updated successfully. Changes will be applied to your job listings.',
        type: 'success',
        actionUrl: '/settings/branding',
        metadata: {
          updatedAt: new Date(),
          changes: Object.keys(brandingData),
          whiteLabelEnabled: brandingData.whiteLabelEnabled || existingBranding.whiteLabelEnabled,
        },
      });
      
      return updatedBranding;
    } else {
      const newBranding = new this.brandingModel({
        user: userId,
        ...brandingData,
      });
      const savedBranding = await newBranding.save();
      
      // Send notification about branding creation
      await this.notificationsService.createNotification({
        user: userId,
        title: '🎨 Custom Branding Activated',
        message: 'Your custom branding has been set up successfully! Your job listings will now display with your company branding.',
        type: 'success',
        actionUrl: '/settings/branding',
        metadata: {
          createdAt: new Date(),
          whiteLabelEnabled: brandingData.whiteLabelEnabled || false,
          hasLogo: !!brandingData.logo,
          hasCustomColors: !!(brandingData.primaryColor || brandingData.secondaryColor),
        },
      });
      
      return savedBranding;
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
    const updatedBranding = await branding.save();
    
    // Send notification about branding update
    await this.notificationsService.createNotification({
      user: userId,
      title: '🎨 Branding Settings Updated',
      message: 'Your company branding has been updated successfully. Changes will be reflected in your job listings.',
      type: 'success',
      actionUrl: '/settings/branding',
      metadata: {
        updatedAt: new Date(),
        changes: Object.keys(brandingData),
        whiteLabelEnabled: brandingData.whiteLabelEnabled || branding.whiteLabelEnabled,
      },
    });
    
    return updatedBranding;
  }

  async deleteBranding(userId: string): Promise<void> {
    const branding = await this.brandingModel.findOne({ user: userId });
    await this.brandingModel.findOneAndDelete({ user: userId });
    
    // Send notification about branding deletion
    if (branding) {
      await this.notificationsService.createNotification({
        user: userId,
        title: '🗑️ Branding Removed',
        message: 'Your custom branding has been removed. Your job listings will now use the default styling.',
        type: 'info',
        actionUrl: '/settings/branding',
        metadata: {
          removedAt: new Date(),
          hadWhiteLabel: branding.whiteLabelEnabled,
        },
      });
    }
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

  /**
   * Enable white-label features and send notification
   */
  async enableWhiteLabel(userId: string, whiteLabelData: any): Promise<Branding> {
    const subscription = await this.subscriptionsService.getUserSubscription(userId);
    if (!subscription || !this.hasWhiteLabelAccess(subscription.plan)) {
      throw new BadRequestException('White-label features require Enterprise subscription');
    }

    const branding = await this.brandingModel.findOne({ user: userId });
    if (!branding) {
      throw new NotFoundException('Branding not found. Please set up basic branding first.');
    }

    // Update white-label settings
    branding.whiteLabelEnabled = true;
    branding.whiteLabelSettings = {
      ...branding.whiteLabelSettings,
      ...whiteLabelData,
    };

    const updatedBranding = await branding.save();

    // Send notification about white-label activation
    await this.notificationsService.createNotification({
      user: userId,
      title: '🏷️ White-label Features Activated',
      message: 'Your white-label features have been activated! Your job portal now has a completely customized appearance.',
      type: 'success',
      actionUrl: '/settings/branding',
      metadata: {
        whiteLabelEnabled: true,
        customDomain: whiteLabelData.customDomain,
        hidePoweredBy: whiteLabelData.hidePoweredBy,
        activatedAt: new Date(),
      },
    });

    return updatedBranding;
  }

  /**
   * Update custom domain and send notification
   */
  async updateCustomDomain(userId: string, domain: string): Promise<Branding> {
    const branding = await this.brandingModel.findOne({ user: userId });
    if (!branding) {
      throw new NotFoundException('Branding not found');
    }

    if (!branding.whiteLabelEnabled) {
      throw new BadRequestException('White-label features must be enabled first');
    }

    const oldDomain = branding.customDomain;
    branding.customDomain = domain;
    const updatedBranding = await branding.save();

    // Send notification about domain update
    await this.notificationsService.createNotification({
      user: userId,
      title: '🌐 Custom Domain Updated',
      message: `Your custom domain has been updated to ${domain}. DNS changes may take up to 24 hours to propagate.`,
      type: 'info',
      actionUrl: '/settings/branding',
      metadata: {
        newDomain: domain,
        oldDomain,
        updatedAt: new Date(),
        dnsPropagationTime: '24 hours',
      },
    });

    return updatedBranding;
  }

  /**
   * Update SEO settings and send notification
   */
  async updateSEOSettings(userId: string, seoSettings: any): Promise<Branding> {
    const branding = await this.brandingModel.findOne({ user: userId });
    if (!branding) {
      throw new NotFoundException('Branding not found');
    }

    if (!branding.whiteLabelEnabled) {
      throw new BadRequestException('White-label features must be enabled first');
    }

    branding.whiteLabelSettings = {
      ...branding.whiteLabelSettings,
      customMetaTitle: seoSettings.metaTitle,
      customMetaDescription: seoSettings.metaDescription,
      customKeywords: seoSettings.keywords,
      customRobotsTxt: seoSettings.robotsTxt,
    };

    const updatedBranding = await branding.save();

    // Send notification about SEO settings update
    await this.notificationsService.createNotification({
      user: userId,
      title: '🔍 SEO Settings Updated',
      message: 'Your SEO settings have been updated. Search engines will index your customized meta information.',
      type: 'success',
      actionUrl: '/settings/branding',
      metadata: {
        metaTitle: seoSettings.metaTitle,
        metaDescription: seoSettings.metaDescription,
        keywordsCount: seoSettings.keywords?.length || 0,
        updatedAt: new Date(),
      },
    });

    return updatedBranding;
  }

  /**
   * Update email templates and send notification
   */
  async updateEmailTemplates(userId: string, emailTemplates: any): Promise<Branding> {
    const branding = await this.brandingModel.findOne({ user: userId });
    if (!branding) {
      throw new NotFoundException('Branding not found');
    }

    if (!branding.whiteLabelEnabled) {
      throw new BadRequestException('White-label features must be enabled first');
    }

    branding.whiteLabelSettings = {
      ...branding.whiteLabelSettings,
      customEmailTemplates: {
        fromName: emailTemplates.fromName,
        fromEmail: emailTemplates.fromEmail,
        replyTo: emailTemplates.replyTo,
      },
    };

    const updatedBranding = await branding.save();

    // Send notification about email templates update
    await this.notificationsService.createNotification({
      user: userId,
      title: '📧 Email Templates Updated',
      message: `Your custom email templates have been updated. All outgoing emails will now use ${emailTemplates.fromName} as the sender.`,
      type: 'success',
      actionUrl: '/settings/branding',
      metadata: {
        fromName: emailTemplates.fromName,
        fromEmail: emailTemplates.fromEmail,
        replyTo: emailTemplates.replyTo,
        updatedAt: new Date(),
      },
    });

    return updatedBranding;
  }

  /**
   * Update legal pages and send notification
   */
  async updateLegalPages(userId: string, legalPages: any): Promise<Branding> {
    const branding = await this.brandingModel.findOne({ user: userId });
    if (!branding) {
      throw new NotFoundException('Branding not found');
    }

    if (!branding.whiteLabelEnabled) {
      throw new BadRequestException('White-label features must be enabled first');
    }

    branding.whiteLabelSettings = {
      ...branding.whiteLabelSettings,
      customLegalPages: {
        ...branding.whiteLabelSettings.customLegalPages,
        ...legalPages,
      },
    };

    const updatedBranding = await branding.save();

    // Send notification about legal pages update
    await this.notificationsService.createNotification({
      user: userId,
      title: '📄 Legal Pages Updated',
      message: 'Your custom legal pages have been updated. These will be displayed on your white-label job portal.',
      type: 'success',
      actionUrl: '/settings/branding',
      metadata: {
        updatedPages: Object.keys(legalPages),
        updatedAt: new Date(),
      },
    });

    return updatedBranding;
  }
}
