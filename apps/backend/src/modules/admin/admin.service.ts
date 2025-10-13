import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from '../applications/schemas/application.schema';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { Subscription, SubscriptionDocument } from '../subscriptions/schemas/subscription.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { ActivityService } from './activity.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    private activityService: ActivityService,
  ) {}

  async getDashboardStats() {
    const [
      totalUsers,
      totalJobs,
      totalApplications,
      totalCompanies,
      activeSubscriptions,
      usersThisMonth,
      jobsThisMonth,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.jobModel.countDocuments(),
      this.applicationModel.countDocuments(),
      this.companyModel.countDocuments(),
      this.subscriptionModel.countDocuments({ status: 'active' }),
      this.userModel.countDocuments({
        createdAt: { $gte: new Date(new Date().setDate(1)) },
      }),
      this.jobModel.countDocuments({
        createdAt: { $gte: new Date(new Date().setDate(1)) },
      }),
    ]);

    // User by role
    const usersByRole = await this.userModel.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    // Jobs by status
    const jobsByStatus = await this.jobModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Applications by status
    const applicationsByStatus = await this.applicationModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Revenue calculation (simplified)
    const subscriptions = await this.subscriptionModel.find({ status: 'active' });
    const revenue = subscriptions.reduce((sum, sub) => {
      const prices = { basic: 29, pro: 79, enterprise: 199 };
      return sum + (prices[sub.plan] || 0);
    }, 0);

    return {
      overview: {
        totalUsers,
        totalJobs,
        totalApplications,
        totalCompanies,
        activeSubscriptions,
        usersThisMonth,
        jobsThisMonth,
        revenue,
      },
      usersByRole,
      jobsByStatus,
      applicationsByStatus,
    };
  }

  async getDashboardStatsForFrontend() {
    const [
      totalUsers,
      activeUsers,
      totalJobs,
      pendingJobs,
      totalApplications,
      totalCompanies,
      activeSubscriptions,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ isActive: true }),
      this.jobModel.countDocuments(),
      this.jobModel.countDocuments({ status: 'draft' }),
      this.applicationModel.countDocuments(),
      this.companyModel.countDocuments(),
      this.subscriptionModel.countDocuments({ status: 'active' }),
    ]);

    // Revenue calculation
    const subscriptions = await this.subscriptionModel.find({ status: 'active' });
    const revenue = subscriptions.reduce((sum, sub) => {
      const prices = { basic: 29, pro: 79, enterprise: 199 };
      return sum + (prices[sub.plan] || 0);
    }, 0);

    return {
      totalUsers,
      activeUsers,
      totalJobs,
      pendingJobs,
      totalApplications,
      totalCompanies,
      revenue,
      subscriptions: activeSubscriptions,
    };
  }

  async getAllUsers(filters: any = {}) {
    const query: any = {};
    if (filters.role) query.role = filters.role;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;

    return this.userModel.find(query).select('-password').sort({ createdAt: -1 });
  }

  async toggleUserStatus(userId: string) {
    const user = await this.userModel.findById(userId);
    user.isActive = !user.isActive;
    await user.save();
    return user;
  }

  async getAllJobs(filters: any = {}) {
    const query: any = {};
    if (filters.status) query.status = filters.status;
    if (filters.jobType) query.jobType = filters.jobType;
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { location: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      this.jobModel
        .find(query)
        .populate('company', 'name')
        .populate('postedBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.jobModel.countDocuments(query),
    ]);

    return {
      jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateJobStatus(jobId: string, updateData: any) {
    const job = await this.jobModel.findByIdAndUpdate(
      jobId,
      updateData,
      { new: true }
    ).populate('company', 'name').populate('postedBy', 'fullName email');

    if (!job) {
      throw new Error('Job not found');
    }

    return job;
  }

  async getAllApplications() {
    return this.applicationModel
      .find()
      .populate('job', 'title')
      .populate('applicant', 'fullName email')
      .populate('company', 'name')
      .sort({ createdAt: -1 })
      .limit(100);
  }

  async getAllCompanies() {
    return this.companyModel
      .find()
      .populate('owner', 'fullName email')
      .sort({ createdAt: -1 });
  }

  async getAllSubscriptions() {
    return this.subscriptionModel
      .find()
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 });
  }

  async getRevenueStats() {
    const subscriptions = await this.subscriptionModel.find({ status: 'active' });

    const byPlan = await this.subscriptionModel.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]);

    const prices = { basic: 29, pro: 79, enterprise: 199 };
    const totalRevenue = subscriptions.reduce((sum, sub) => sum + (prices[sub.plan] || 0), 0);

    return {
      totalRevenue,
      byPlan,
      activeSubscriptions: subscriptions.length,
    };
  }

  async getSystemHealth() {
    // Simulate system health checks
    const startTime = Date.now();
    
    // Check database connection
    const dbCheck = await this.userModel.countDocuments().then(() => true).catch(() => false);
    
    // Simulate API response time
    const apiResponseTime = Date.now() - startTime;
    
    // Simulate storage usage (in a real app, you'd check actual disk usage)
    const storageUsage = Math.floor(Math.random() * 30) + 20; // 20-50%
    
    return {
      databaseStatus: dbCheck ? 'healthy' : 'error',
      serverStatus: 'healthy',
      emailStatus: 'healthy',
      storageUsage,
      apiResponseTime,
    };
  }

  async getRecentUsers(limit: number = 10) {
    return this.userModel
      .find()
      .select('fullName email role isActive createdAt lastLogin')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async getPendingJobs(limit: number = 10) {
    return this.jobModel
      .find({ status: 'draft' })
      .populate('company', 'name')
      .populate('postedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async getRecentActivity(limit: number = 10) {
    const activities = await this.activityService.getRecentActivity(limit);
    
    return activities.map(activity => ({
      _id: activity._id,
      type: activity.type,
      description: activity.description,
      user: {
        _id: (activity.userId as any)?._id,
        fullName: (activity.userId as any)?.fullName || 'Unknown User',
        role: (activity.userId as any)?.role || 'unknown',
      },
      targetUser: activity.targetUserId ? {
        _id: (activity.targetUserId as any)._id,
        fullName: (activity.targetUserId as any).fullName,
      } : null,
      job: activity.jobId ? {
        _id: (activity.jobId as any)._id,
        title: (activity.jobId as any).title,
      } : null,
      application: activity.applicationId ? {
        _id: (activity.applicationId as any)._id,
        status: (activity.applicationId as any).status,
      } : null,
      company: activity.companyId ? {
        _id: (activity.companyId as any)._id,
        name: (activity.companyId as any).name,
      } : null,
      timestamp: activity.createdAt,
      metadata: activity.metadata,
    }));
  }

  async getUserActivities(userId: string) {
    const activities = await this.activityService.getActivityByUser(userId, 20);

    return activities.map(activity => ({
      _id: activity._id,
      type: activity.type,
      description: activity.description,
      timestamp: activity.createdAt,
      metadata: activity.metadata,
    }));
  }

  async getSubscriptionManagement() {
    const subscriptions = await this.subscriptionModel
      .find()
      .populate('user', 'fullName email role')
      .sort({ createdAt: -1 });

    return subscriptions.map(sub => ({
      _id: sub._id,
      user: {
        _id: (sub.user as any)._id,
        fullName: (sub.user as any).fullName,
        email: (sub.user as any).email,
        role: (sub.user as any).role,
      },
      plan: sub.plan,
      status: sub.status,
      jobPostsLimit: sub.jobPostsLimit,
      jobPostsUsed: sub.jobPostsUsed,
      boostsAvailable: sub.boostsAvailable,
      boostsUsed: sub.boostsUsed,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      autoRenew: sub.autoRenew,
      stripeCustomerId: sub.stripeCustomerId,
      createdAt: (sub as any).createdAt,
      updatedAt: (sub as any).updatedAt,
    }));
  }

  async updateSubscriptionStatus(subscriptionId: string, status: string) {
    const subscription = await this.subscriptionModel.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.status = status as any;
    await subscription.save();

    return subscription;
  }

  async updateSubscriptionPlan(subscriptionId: string, plan: string) {
    const subscription = await this.subscriptionModel.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.plan = plan as any;
    
    // Update job posts limit based on plan
    switch (plan) {
      case 'free':
        subscription.jobPostsLimit = 5;
        break;
      case 'basic':
        subscription.jobPostsLimit = 25;
        break;
      case 'pro':
        subscription.jobPostsLimit = 100;
        break;
      case 'enterprise':
        subscription.jobPostsLimit = 999999;
        break;
    }

    await subscription.save();
    return subscription;
  }

  async cancelSubscription(subscriptionId: string) {
    const subscription = await this.subscriptionModel.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.status = 'cancelled' as any;
    subscription.autoRenew = false;
    await subscription.save();

    return subscription;
  }

  async getSubscriptionStats() {
    const [
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      freeSubscriptions,
      basicSubscriptions,
      proSubscriptions,
      enterpriseSubscriptions,
    ] = await Promise.all([
      this.subscriptionModel.countDocuments(),
      this.subscriptionModel.countDocuments({ status: 'active' }),
      this.subscriptionModel.countDocuments({ status: 'cancelled' }),
      this.subscriptionModel.countDocuments({ plan: 'free' }),
      this.subscriptionModel.countDocuments({ plan: 'basic' }),
      this.subscriptionModel.countDocuments({ plan: 'pro' }),
      this.subscriptionModel.countDocuments({ plan: 'enterprise' }),
    ]);

    return {
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      planBreakdown: {
        free: freeSubscriptions,
        basic: basicSubscriptions,
        pro: proSubscriptions,
        enterprise: enterpriseSubscriptions,
      },
    };
  }
}

