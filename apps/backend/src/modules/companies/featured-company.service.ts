import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

export interface FeaturedCompanyProfile {
  _id?: string;
  companyId: string;
  isFeatured: boolean;
  featuredUntil?: Date;
  priority: number; // 1-10, higher number = more priority
  customBanner?: string;
  customDescription?: string;
  featuredJobs: string[]; // Array of job IDs
  stats: {
    profileViews: number;
    jobViews: number;
    applicationsReceived: number;
    featuredSince: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class FeaturedCompanyService {
  private featuredProfiles: FeaturedCompanyProfile[] = []; // In-memory storage for demo

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
  ) {}

  /**
   * Enable featured profile for a company
   */
  async enableFeaturedProfile(
    companyId: string,
    employerId: string,
    customBanner?: string,
    customDescription?: string,
  ): Promise<FeaturedCompanyProfile> {
    // Verify the company belongs to the employer
    const company = await this.userModel.findById(companyId);
    if (!company || company.role !== 'employer') {
      throw new NotFoundException('Company not found');
    }

    // Check if employer has featured profile feature enabled
    const hasFeaturedProfile = await this.checkFeatureEnabled(employerId, 'featuredProfileEnabled');

    if (!hasFeaturedProfile) {
      throw new ForbiddenException('Featured profile is not available on your current plan');
    }

    // Check if already featured
    const existingProfile = this.featuredProfiles.find(p => p.companyId === companyId);
    if (existingProfile && existingProfile.isFeatured) {
      throw new ForbiddenException('Company profile is already featured');
    }

    // Create or update featured profile
    const featuredProfile: FeaturedCompanyProfile = {
      _id: existingProfile?._id || Date.now().toString(),
      companyId,
      isFeatured: true,
      featuredUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      priority: 5, // Default priority
      customBanner,
      customDescription,
      featuredJobs: [],
      stats: {
        profileViews: 0,
        jobViews: 0,
        applicationsReceived: 0,
        featuredSince: new Date(),
      },
      createdAt: existingProfile?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    if (existingProfile) {
      const index = this.featuredProfiles.findIndex(p => p._id === existingProfile._id);
      this.featuredProfiles[index] = featuredProfile;
    } else {
      this.featuredProfiles.push(featuredProfile);
    }

    return featuredProfile;
  }

  /**
   * Disable featured profile for a company
   */
  async disableFeaturedProfile(companyId: string, employerId: string): Promise<void> {
    const profile = this.featuredProfiles.find(p => p.companyId === companyId);
    if (!profile) {
      throw new NotFoundException('Featured profile not found');
    }

    profile.isFeatured = false;
    profile.updatedAt = new Date();
  }

  /**
   * Get featured companies list (for public display)
   */
  async getFeaturedCompanies(limit: number = 10): Promise<Array<{
    company: any;
    profile: FeaturedCompanyProfile;
    featuredJobs: any[];
  }>> {
    const activeProfiles = this.featuredProfiles
      .filter(p => p.isFeatured && (!p.featuredUntil || p.featuredUntil > new Date()))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);

    const featuredCompanies = await Promise.all(
      activeProfiles.map(async (profile) => {
        const company = await this.userModel.findById(profile.companyId);
        const featuredJobs = await this.jobModel
          .find({ 
            postedBy: profile.companyId,
            _id: { $in: profile.featuredJobs },
            status: 'open'
          })
          .limit(3)
          .select('title location salaryMin salaryMax experienceLevel jobType');

        return {
          company,
          profile,
          featuredJobs,
        };
      })
    );

    return featuredCompanies.filter(item => item.company); // Filter out deleted companies
  }

  /**
   * Get company's featured profile status
   */
  async getCompanyFeaturedProfile(companyId: string): Promise<FeaturedCompanyProfile | null> {
    return this.featuredProfiles.find(p => p.companyId === companyId) || null;
  }

  /**
   * Update featured profile details
   */
  async updateFeaturedProfile(
    companyId: string,
    employerId: string,
    updates: {
      customBanner?: string;
      customDescription?: string;
      priority?: number;
      featuredJobs?: string[];
    },
  ): Promise<FeaturedCompanyProfile> {
    const profile = this.featuredProfiles.find(p => p.companyId === companyId);
    if (!profile) {
      throw new NotFoundException('Featured profile not found');
    }

    if (!profile.isFeatured) {
      throw new ForbiddenException('Company profile is not currently featured');
    }

    // Update profile
    if (updates.customBanner !== undefined) profile.customBanner = updates.customBanner;
    if (updates.customDescription !== undefined) profile.customDescription = updates.customDescription;
    if (updates.priority !== undefined) profile.priority = Math.min(10, Math.max(1, updates.priority));
    if (updates.featuredJobs !== undefined) profile.featuredJobs = updates.featuredJobs;

    profile.updatedAt = new Date();

    return profile;
  }

  /**
   * Track profile view
   */
  async trackProfileView(companyId: string): Promise<void> {
    const profile = this.featuredProfiles.find(p => p.companyId === companyId);
    if (profile && profile.isFeatured) {
      profile.stats.profileViews++;
    }
  }

  /**
   * Track job view
   */
  async trackJobView(companyId: string, jobId: string): Promise<void> {
    const profile = this.featuredProfiles.find(p => p.companyId === companyId);
    if (profile && profile.isFeatured) {
      profile.stats.jobViews++;
    }
  }

  /**
   * Track application received
   */
  async trackApplicationReceived(companyId: string): Promise<void> {
    const profile = this.featuredProfiles.find(p => p.companyId === companyId);
    if (profile && profile.isFeatured) {
      profile.stats.applicationsReceived++;
    }
  }

  /**
   * Get featured profile analytics
   */
  async getFeaturedProfileAnalytics(companyId: string, employerId: string): Promise<{
    profile: FeaturedCompanyProfile;
    performance: {
      profileViews: number;
      jobViews: number;
      applicationsReceived: number;
      conversionRate: number;
      featuredDays: number;
    };
    comparison: {
      averageProfileViews: number;
      averageJobViews: number;
      averageApplications: number;
    };
  }> {
    const profile = this.featuredProfiles.find(p => p.companyId === companyId);
    if (!profile) {
      throw new NotFoundException('Featured profile not found');
    }

    const featuredDays = Math.floor(
      (new Date().getTime() - profile.stats.featuredSince.getTime()) / (1000 * 60 * 60 * 24)
    );

    const conversionRate = profile.stats.profileViews > 0 
      ? (profile.stats.applicationsReceived / profile.stats.profileViews) * 100 
      : 0;

    // Calculate averages (simplified for demo)
    const allProfiles = this.featuredProfiles.filter(p => p.isFeatured);
    const averageProfileViews = allProfiles.length > 0 
      ? allProfiles.reduce((sum, p) => sum + p.stats.profileViews, 0) / allProfiles.length 
      : 0;
    const averageJobViews = allProfiles.length > 0 
      ? allProfiles.reduce((sum, p) => sum + p.stats.jobViews, 0) / allProfiles.length 
      : 0;
    const averageApplications = allProfiles.length > 0 
      ? allProfiles.reduce((sum, p) => sum + p.stats.applicationsReceived, 0) / allProfiles.length 
      : 0;

    return {
      profile,
      performance: {
        profileViews: profile.stats.profileViews,
        jobViews: profile.stats.jobViews,
        applicationsReceived: profile.stats.applicationsReceived,
        conversionRate: Math.round(conversionRate * 100) / 100,
        featuredDays,
      },
      comparison: {
        averageProfileViews: Math.round(averageProfileViews),
        averageJobViews: Math.round(averageJobViews),
        averageApplications: Math.round(averageApplications),
      },
    };
  }

  /**
   * Get all featured profiles (admin only)
   */
  async getAllFeaturedProfiles(): Promise<FeaturedCompanyProfile[]> {
    return this.featuredProfiles.filter(p => p.isFeatured);
  }

  /**
   * Check if company is featured
   */
  async isCompanyFeatured(companyId: string): Promise<boolean> {
    const profile = this.featuredProfiles.find(p => p.companyId === companyId);
    return profile ? profile.isFeatured && (!profile.featuredUntil || profile.featuredUntil > new Date()) : false;
  }

  /**
   * Check if a specific feature is enabled for the employer
   */
  private async checkFeatureEnabled(employerId: string, featureName: string): Promise<boolean> {
    try {
      // Get subscription from database
      const { Subscription, SubscriptionSchema } = await import('../subscriptions/schemas/subscription.schema');
      const subscriptionModel = this.userModel.db.model('Subscription', SubscriptionSchema);
      
      const subscription = await subscriptionModel.findOne({ user: employerId });
      if (!subscription) {
        return false; // No subscription = no features
      }

      // Check the specific feature
      return subscription[featureName] || false;
    } catch (error) {
      console.error('Error checking feature:', error);
      return false; // Default to false on error
    }
  }
}
