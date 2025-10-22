import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { Model } from 'mongoose';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ApiKey, ApiKeyDocument, ApiKeyStatus } from './schemas/api-key.schema';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectModel(ApiKey.name) private apiKeyModel: Model<ApiKeyDocument>,
    private subscriptionsService: SubscriptionsService,
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
}
