import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscription, SubscriptionDocument } from '../subscriptions/schemas/subscription.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { PlatformSettings, PlatformSettingsDocument } from './schemas/platform-settings.schema';

export interface PlatformSettingsData {
  general: {
    siteName: string;
    siteDescription: string;
    siteUrl: string;
    adminEmail: string;
    timezone: string;
    language: string;
  };
  security: {
    enableRegistration: boolean;
    requireEmailVerification: boolean;
    enableTwoFactor: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    adminNotifications: boolean;
    userNotifications: boolean;
  };
  maintenance: {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    allowAdminAccess: boolean;
  };
}

@Injectable()
export class PlatformSettingsService {
  constructor(
    @InjectModel(PlatformSettings.name)
    private settingsModel: Model<PlatformSettingsDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  async getSettings(): Promise<PlatformSettingsData> {
    const settings = await this.settingsModel.find({ isActive: true }).lean();
    
    const defaultSettings: PlatformSettingsData = {
      general: {
        siteName: 'Job Portal',
        siteDescription: 'Find Your Dream Job',
        siteUrl: 'http://localhost:3000',
        adminEmail: 'admin@jobportal.com',
        timezone: 'UTC',
        language: 'en',
      },
      security: {
        enableRegistration: true,
        requireEmailVerification: true,
        enableTwoFactor: false,
        sessionTimeout: 24,
        maxLoginAttempts: 5,
      },
      notifications: {
        emailNotifications: true,
        pushNotifications: true,
        adminNotifications: true,
        userNotifications: true,
      },
      maintenance: {
        maintenanceMode: false,
        maintenanceMessage: 'We are currently performing maintenance. Please check back later.',
        allowAdminAccess: true,
      },
    };

    // Merge stored settings with defaults
    settings.forEach(setting => {
      const keys = setting.key.split('.');
      if (keys.length >= 2) {
        const [category, ...rest] = keys;
        const property = rest.join('.');
        if (defaultSettings[category] && defaultSettings[category][property] !== undefined) {
          defaultSettings[category][property] = setting.value;
        }
      }
    });

    return defaultSettings;
  }

  async updateSettings(settingsData: PlatformSettingsData): Promise<void> {
    const flatSettings: { key: string; value: any }[] = [];

    // Flatten nested settings object
    Object.entries(settingsData).forEach(([category, categoryData]) => {
      Object.entries(categoryData).forEach(([property, value]) => {
        flatSettings.push({
          key: `${category}.${property}`,
          value,
        });
      });
    });

    // Update or create each setting
    for (const setting of flatSettings) {
      await this.settingsModel.findOneAndUpdate(
        { key: setting.key },
        {
          key: setting.key,
          value: setting.value,
          category: setting.key.split('.')[0],
          isActive: true,
        },
        { upsert: true, new: true },
      );
    }
  }

  async resetToDefaults(): Promise<void> {
    await this.settingsModel.deleteMany({});
  }

  async getSystemStats() {
    // Get real data from database
    const totalUsers = await this.userModel.countDocuments({ isActive: true });
    const activeSubscriptions = await this.subscriptionModel.countDocuments({ status: 'active' });
    
    // Determine security level based on settings
    const securitySettings = await this.getSettings();
    let securityLevel = 'medium';
    if (securitySettings.security.requireEmailVerification && 
        securitySettings.security.enableTwoFactor && 
        securitySettings.security.maxLoginAttempts <= 3) {
      securityLevel = 'high';
    } else if (!securitySettings.security.requireEmailVerification && 
               securitySettings.security.maxLoginAttempts > 5) {
      securityLevel = 'low';
    }

    return {
      totalUsers,
      activeSessions: activeSubscriptions, // Using active subscriptions as proxy for active sessions
      serverStatus: 'online',
      databaseStatus: 'connected',
      emailServiceStatus: 'configured', // This would be checked against actual email service
      securityLevel,
    };
  }
}
