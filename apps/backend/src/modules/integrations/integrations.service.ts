import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Integration, IntegrationDocument, IntegrationType } from './schemas/integration.schema';

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectModel(Integration.name) private integrationModel: Model<IntegrationDocument>,
    private configService: ConfigService,
  ) {}

  async connectIntegration(
    userId: string,
    type: IntegrationType,
    credentials: any,
    settings?: any,
    companyId?: string,
  ): Promise<IntegrationDocument> {
    // Check if integration already exists
    const existing = await this.integrationModel.findOne({
      userId,
      type,
      status: { $ne: 'inactive' },
    });

    if (existing) {
      // Update existing integration
      existing.credentials = credentials;
      existing.settings = settings || existing.settings;
      existing.status = 'active' as any;
      existing.companyId = companyId;
      return existing.save();
    }

    // Create new integration
    return this.integrationModel.create({
      userId,
      companyId,
      type,
      credentials,
      settings: settings || {},
      status: 'active',
    });
  }

  async disconnectIntegration(userId: string, integrationId: string): Promise<void> {
    const integration = await this.integrationModel.findOne({
      _id: integrationId,
      userId,
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    integration.status = 'inactive' as any;
    integration.credentials = undefined;
    await integration.save();
  }

  async getUserIntegrations(userId: string): Promise<IntegrationDocument[]> {
    return this.integrationModel
      .find({
        userId,
        status: { $ne: 'inactive' },
      })
      .select('-credentials') // Don't expose credentials
      .exec();
  }

  async getIntegrationById(userId: string, integrationId: string): Promise<IntegrationDocument> {
    const integration = await this.integrationModel.findOne({
      _id: integrationId,
      userId,
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    return integration;
  }

  async updateIntegrationSettings(
    userId: string,
    integrationId: string,
    settings: any,
  ): Promise<IntegrationDocument> {
    const integration = await this.integrationModel.findOne({
      _id: integrationId,
      userId,
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    integration.settings = { ...integration.settings, ...settings };
    return integration.save();
  }

  async syncIntegration(userId: string, integrationId: string): Promise<any> {
    const integration = await this.integrationModel.findOne({
      _id: integrationId,
      userId,
    });

    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    if (integration.status !== 'active') {
      throw new BadRequestException('Integration is not active');
    }

    // Perform sync based on integration type
    try {
      let syncResult;

      switch (integration.type) {
        case IntegrationType.GOOGLE_CALENDAR:
          syncResult = await this.syncGoogleCalendar(integration);
          break;
        case IntegrationType.LINKEDIN:
          syncResult = await this.syncLinkedIn(integration);
          break;
        case IntegrationType.SLACK:
          syncResult = await this.syncSlack(integration);
          break;
        default:
          syncResult = { message: 'Sync not implemented for this integration type' };
      }

      integration.lastSyncedAt = new Date();
      integration.errorMessage = undefined;
      await integration.save();

      return syncResult;
    } catch (error) {
      integration.status = 'error' as any;
      integration.errorMessage = error.message;
      await integration.save();
      throw error;
    }
  }

  // Integration-specific methods (placeholders for actual implementation)
  
  private async syncGoogleCalendar(integration: IntegrationDocument): Promise<any> {
    // In production, this would use Google Calendar API
    // For now, return success message
    return {
      success: true,
      message: 'Google Calendar sync completed',
      eventsSynced: 0,
    };
  }

  private async syncLinkedIn(integration: IntegrationDocument): Promise<any> {
    // In production, this would use LinkedIn API to post jobs
    return {
      success: true,
      message: 'LinkedIn sync completed',
      jobsPosted: 0,
    };
  }

  private async syncSlack(integration: IntegrationDocument): Promise<any> {
    // In production, this would send notifications to Slack
    return {
      success: true,
      message: 'Slack integration active',
      notificationsSent: 0,
    };
  }

  async getAvailableIntegrations(): Promise<any[]> {
    return [
      {
        type: 'google_calendar',
        name: 'Google Calendar',
        description: 'Sync interviews with your Google Calendar',
        icon: 'calendar',
        category: 'productivity',
        requiresAuth: true,
      },
      {
        type: 'linkedin',
        name: 'LinkedIn',
        description: 'Post jobs directly to LinkedIn and import candidate profiles',
        icon: 'linkedin',
        category: 'job_boards',
        requiresAuth: true,
      },
      {
        type: 'slack',
        name: 'Slack',
        description: 'Get real-time notifications in your Slack workspace',
        icon: 'slack',
        category: 'communication',
        requiresAuth: true,
      },
      {
        type: 'greenhouse',
        name: 'Greenhouse ATS',
        description: 'Sync candidates with Greenhouse ATS',
        icon: 'briefcase',
        category: 'ats',
        requiresAuth: true,
      },
      {
        type: 'lever',
        name: 'Lever ATS',
        description: 'Integrate with Lever recruiting platform',
        icon: 'briefcase',
        category: 'ats',
        requiresAuth: true,
      },
      {
        type: 'zapier',
        name: 'Zapier',
        description: 'Connect with 5000+ apps via Zapier',
        icon: 'zap',
        category: 'automation',
        requiresAuth: false,
      },
    ];
  }
}
