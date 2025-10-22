import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { Model } from 'mongoose';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ApiKey, ApiKeyDocument, ApiKeyStatus } from './schemas/api-key.schema';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectModel(ApiKey.name) private apiKeyModel: Model<ApiKeyDocument>,
    private subscriptionsService: SubscriptionsService,
    private notificationsService: NotificationsService,
  ) {}

  async createApiKey(userId: string, name: string, permissions: string[] = []): Promise<{ keyId: string; apiKey: string }> {
    // Check if user has API access (Enterprise plan)
    const subscription = await this.subscriptionsService.getUserSubscription(userId);
    if (!subscription || !this.hasApiAccess(subscription.plan)) {
      throw new UnauthorizedException('API access requires Enterprise subscription');
    }

    // Check if user has reached API key limit
    const existingKeys = await this.apiKeyModel.countDocuments({ 
      user: userId, 
      status: { $in: [ApiKeyStatus.ACTIVE, ApiKeyStatus.INACTIVE] } 
    });

    const maxKeys = this.getMaxApiKeys(subscription.plan);
    if (existingKeys >= maxKeys) {
      throw new BadRequestException(`Maximum ${maxKeys} API keys allowed for your plan`);
    }

    // Generate API key
    const keyId = crypto.randomBytes(16).toString('hex');
    const apiKey = `jbp_${crypto.randomBytes(32).toString('hex')}`;
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Create API key record
    const newApiKey = new this.apiKeyModel({
      user: userId,
      keyId,
      hashedKey,
      name,
      status: ApiKeyStatus.ACTIVE,
      permissions: permissions.length > 0 ? permissions : this.getDefaultPermissions(subscription.plan),
      rateLimitPerHour: this.getRateLimit(subscription.plan),
    });

    await newApiKey.save();

    // Send notification about API key creation
    await this.notificationsService.createNotification({
      user: userId,
      title: '🔑 New API Key Created',
      message: `API key "${name}" has been created successfully. Keep it secure and don't share it with others.`,
      type: 'success',
      actionUrl: '/settings/api-keys',
      metadata: {
        keyId,
        keyName: name,
        permissions: newApiKey.permissions,
        rateLimit: newApiKey.rateLimitPerHour,
        createdAt: new Date(),
      },
    });

    return { keyId, apiKey };
  }

  async getApiKeys(userId: string): Promise<ApiKey[]> {
    return this.apiKeyModel.find({ 
      user: userId,
      status: { $ne: ApiKeyStatus.REVOKED }
    }).select('-hashedKey').sort({ createdAt: -1 });
  }

  async revokeApiKey(userId: string, keyId: string): Promise<void> {
    const apiKey = await this.apiKeyModel.findOne({ user: userId, keyId });
    if (!apiKey) {
      throw new BadRequestException('API key not found');
    }

    apiKey.status = ApiKeyStatus.REVOKED;
    await apiKey.save();

    // Send notification about API key revocation
    await this.notificationsService.createNotification({
      user: userId,
      title: '🔒 API Key Revoked',
      message: `API key "${apiKey.name}" has been revoked and is no longer active. Any applications using this key will stop working.`,
      type: 'warning',
      actionUrl: '/settings/api-keys',
      metadata: {
        keyId,
        keyName: apiKey.name,
        revokedAt: new Date(),
      },
    });
  }

  async updateApiKey(userId: string, keyId: string, updates: Partial<ApiKey>): Promise<ApiKey> {
    const apiKey = await this.apiKeyModel.findOne({ user: userId, keyId });
    if (!apiKey) {
      throw new BadRequestException('API key not found');
    }

    Object.assign(apiKey, updates);
    await apiKey.save();
    return apiKey;
  }

  async validateApiKey(apiKey: string): Promise<ApiKey | null> {
    if (!apiKey.startsWith('jbp_')) {
      return null;
    }

    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
    const keyRecord = await this.apiKeyModel.findOne({ 
      hashedKey, 
      status: ApiKeyStatus.ACTIVE 
    });

    if (!keyRecord) {
      return null;
    }

    // Check if key is expired
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      return null;
    }

    // Check rate limit
    const now = new Date();
    const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    
    if (!keyRecord.lastResetHour || keyRecord.lastResetHour < currentHour) {
      keyRecord.currentHourUsage = 0;
      keyRecord.lastResetHour = currentHour;
    }

    if (keyRecord.currentHourUsage >= keyRecord.rateLimitPerHour) {
      throw new UnauthorizedException('API rate limit exceeded');
    }

    // Update usage
    keyRecord.currentHourUsage += 1;
    keyRecord.usageCount += 1;
    keyRecord.lastUsed = now;
    await keyRecord.save();

    return keyRecord;
  }

  private hasApiAccess(plan: string): boolean {
    return plan === 'enterprise';
  }

  private getMaxApiKeys(plan: string): number {
    switch (plan) {
      case 'enterprise':
        return 10;
      default:
        return 0;
    }
  }

  private getRateLimit(plan: string): number {
    switch (plan) {
      case 'enterprise':
        return 10000; // 10k requests per hour
      default:
        return 0;
    }
  }

  private getDefaultPermissions(plan: string): string[] {
    switch (plan) {
      case 'enterprise':
        return [
          'jobs:read',
          'jobs:write',
          'jobs:delete',
          'applications:read',
          'applications:write',
          'companies:read',
          'companies:write',
          'analytics:read',
        ];
      default:
        return [];
    }
  }

  /**
   * Check API key usage and send notifications for approaching limits
   */
  async checkApiKeyUsage(): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get all active API keys
    const activeKeys = await this.apiKeyModel.find({
      status: ApiKeyStatus.ACTIVE,
    }).populate('user');

    for (const apiKey of activeKeys) {
      // In a real implementation, you would track API usage in a separate collection
      // For now, we'll simulate checking usage
      const usageCount = await this.getApiKeyUsageCount(apiKey.keyId, oneHourAgo, now);
      const usagePercentage = (usageCount / apiKey.rateLimitPerHour) * 100;

      // Send warning at 80% usage
      if (usagePercentage >= 80 && usagePercentage < 100) {
        await this.notificationsService.createNotification({
          user: (apiKey.user as any)._id.toString(),
          title: '⚠️ API Usage Warning',
          message: `API key "${apiKey.name}" has used ${usageCount}/${apiKey.rateLimitPerHour} requests (${Math.round(usagePercentage)}%). You're approaching the rate limit.`,
          type: 'warning',
          actionUrl: '/settings/api-keys',
          metadata: {
            keyId: apiKey.keyId,
            keyName: apiKey.name,
            usageCount,
            rateLimit: apiKey.rateLimitPerHour,
            usagePercentage: Math.round(usagePercentage),
          },
        });
      }

      // Send alert at 100% usage
      if (usagePercentage >= 100) {
        await this.notificationsService.createNotification({
          user: (apiKey.user as any)._id.toString(),
          title: '🚨 API Rate Limit Exceeded',
          message: `API key "${apiKey.name}" has exceeded its rate limit of ${apiKey.rateLimitPerHour} requests per hour. API calls will be blocked until the limit resets.`,
          type: 'error',
          actionUrl: '/settings/api-keys',
          metadata: {
            keyId: apiKey.keyId,
            keyName: apiKey.name,
            usageCount,
            rateLimit: apiKey.rateLimitPerHour,
            exceededAt: now,
          },
        });
      }
    }
  }

  /**
   * Get API key usage count for a time period
   * In a real implementation, this would query an API usage tracking collection
   */
  private async getApiKeyUsageCount(keyId: string, startTime: Date, endTime: Date): Promise<number> {
    // This is a placeholder - in reality you'd track API usage in a separate collection
    // For demo purposes, return a random number between 0 and the rate limit
    const apiKey = await this.apiKeyModel.findOne({ keyId });
    if (!apiKey) return 0;
    
    // Simulate some usage (0-120% of rate limit)
    return Math.floor(Math.random() * (apiKey.rateLimitPerHour * 1.2));
  }
}
