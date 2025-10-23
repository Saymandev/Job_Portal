import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccountManager, AccountManagerDocument } from '../account-managers/schemas/account-manager.schema';
import { AdvancedAnalyticsService } from '../advanced-analytics/advanced-analytics.service';
import { AnalyticsInsight, AnalyticsInsightDocument } from '../advanced-analytics/schemas/analytics-insight.schema';
import { SalaryDataService } from '../analytics/salary-data.service';
import { SalaryUpdateService } from '../analytics/salary-update.service';
import { ApiKey, ApiKeyDocument } from '../api-keys/schemas/api-key.schema';
import { Application, ApplicationDocument } from '../applications/schemas/application.schema';
import { Branding, BrandingDocument } from '../branding/schemas/branding.schema';
import { WhiteLabelConfig, WhiteLabelConfigDocument } from '../branding/schemas/white-label-config.schema';
import { Conversation, ConversationDocument } from '../chat/schemas/conversation.schema';
import { Message, MessageDocument } from '../chat/schemas/message.schema';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { InterviewSession, InterviewSessionDocument } from '../interviews/schemas/interview-session.schema';
import { InterviewTemplate, InterviewTemplateDocument } from '../interviews/schemas/interview-template.schema';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { ContentFlag, ContentFlagDocument } from '../moderation/schemas/content-flag.schema';
import { SupportTicket, SupportTicketDocument } from '../priority-support/schemas/support-ticket.schema';
import { Subscription, SubscriptionDocument } from '../subscriptions/schemas/subscription.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { ActivityService } from './activity.service';
// import { WhiteLabelConfig, WhiteLabelConfigDocument } from '../branding/schemas/white-label-config.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(ApiKey.name) private apiKeyModel: Model<ApiKeyDocument>,
    @InjectModel(InterviewTemplate.name) private interviewTemplateModel: Model<InterviewTemplateDocument>,
    @InjectModel(InterviewSession.name) private interviewSessionModel: Model<InterviewSessionDocument>,
    @InjectModel(AccountManager.name) private accountManagerModel: Model<AccountManagerDocument>,
    @InjectModel(SupportTicket.name) private supportTicketModel: Model<SupportTicketDocument>,
    @InjectModel(AnalyticsInsight.name) private analyticsInsightModel: Model<AnalyticsInsightDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Branding.name) private brandingModel: Model<BrandingDocument>,
    @InjectModel(WhiteLabelConfig.name) private whiteLabelConfigModel: Model<WhiteLabelConfigDocument>,
    @InjectModel(ContentFlag.name) private contentFlagModel: Model<ContentFlagDocument>,
    private activityService: ActivityService,
    private advancedAnalyticsService: AdvancedAnalyticsService,
    private salaryDataService: SalaryDataService,
    private salaryUpdateService: SalaryUpdateService,
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

  async getAllSubscriptions(
    page: number = 1,
    limit: number = 10,
    plan?: string,
    status?: string,
    search?: string
  ) {
    const skip = (page - 1) * limit;
    const query: any = {};

    // Filter by plan
    if (plan && plan !== 'all') {
      query.plan = plan;
    }

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { 'user.fullName': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } },
        { plan: { $regex: search, $options: 'i' } }
      ];
    }

    const subscriptions = await this.subscriptionModel
      .find(query)
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.subscriptionModel.countDocuments(query);

    return {
      subscriptions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

  async getRevenueCharts() {
    // Generate monthly revenue data for the last 12 months
    const monthlyData = [];
    const currentDate = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      
      const monthlySubscriptions = await this.subscriptionModel.find({
        status: 'active',
        createdAt: { $gte: date, $lt: nextMonth }
      });

      const prices = { basic: 29, pro: 79, enterprise: 199 };
      const monthlyRevenue = monthlySubscriptions.reduce((sum, sub) => sum + (prices[sub.plan] || 0), 0);

      monthlyData.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthlyRevenue,
        subscriptions: monthlySubscriptions.length
      });
    }

    // Generate yearly revenue data for the last 3 years
    const yearlyData = [];
    for (let i = 2; i >= 0; i--) {
      const year = currentDate.getFullYear() - i;
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year + 1, 0, 1);
      
      const yearlySubscriptions = await this.subscriptionModel.find({
        status: 'active',
        createdAt: { $gte: startOfYear, $lt: endOfYear }
      });

      const prices = { basic: 29, pro: 79, enterprise: 199 };
      const yearlyRevenue = yearlySubscriptions.reduce((sum, sub) => sum + (prices[sub.plan] || 0), 0);

      yearlyData.push({
        year: year.toString(),
        revenue: yearlyRevenue,
        subscriptions: yearlySubscriptions.length
      });
    }

    return {
      monthly: monthlyData,
      yearly: yearlyData
    };
  }

  async getSystemHealth() {
    // Simulate system health checks
    const startTime = Date.now();
    
    // Check database connection
    const dbCheck = await this.userModel.countDocuments().then(() => true).catch(() => false);
    
    // Simulate API response time
    const apiResponseTime = Date.now() - startTime;
    
    // Simulate memory usage
    const memoryUsed = Math.floor(Math.random() * 4) + 2; // 2-6 GB
    const memoryTotal = 8; // 8 GB total
    const memoryPercentage = Math.round((memoryUsed / memoryTotal) * 100);
    
    // Simulate CPU usage
    const cpuUsage = Math.floor(Math.random() * 40) + 10; // 10-50%
    const cpuLoad = [
      Math.random() * 2,
      Math.random() * 2,
      Math.random() * 2
    ];
    
    // Simulate storage usage
    const storageUsage = Math.floor(Math.random() * 30) + 20; // 20-50%
    
    return {
      status: dbCheck ? 'healthy' : 'critical',
      uptime: process.uptime(),
      memory: {
        used: memoryUsed * 1024 * 1024 * 1024, // Convert to bytes
        total: memoryTotal * 1024 * 1024 * 1024, // Convert to bytes
        percentage: memoryPercentage
      },
      cpu: {
        usage: cpuUsage,
        load: cpuLoad
      },
      database: {
        status: dbCheck ? 'connected' : 'disconnected',
        responseTime: apiResponseTime,
        connections: Math.floor(Math.random() * 20) + 5
      },
      services: [
        {
          name: 'Database',
          status: dbCheck ? 'running' : 'error',
          uptime: process.uptime(),
          lastCheck: new Date().toISOString()
        },
        {
          name: 'API Server',
          status: 'running',
          uptime: process.uptime(),
          lastCheck: new Date().toISOString()
        },
        {
          name: 'Email Service',
          status: 'running',
          uptime: process.uptime(),
          lastCheck: new Date().toISOString()
        },
        {
          name: 'File Storage',
          status: 'running',
          uptime: process.uptime(),
          lastCheck: new Date().toISOString()
        },
        {
          name: 'Background Jobs',
          status: 'running',
          uptime: process.uptime(),
          lastCheck: new Date().toISOString()
        }
      ],
      storageUsage,
      apiResponseTime
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
      .populate({
        path: 'user',
        select: 'fullName email role',
        match: { role: { $in: ['employer', 'admin'] } } // Only show subscriptions for employers and admins
      })
      .sort({ createdAt: -1 });

    // Filter out subscriptions where user is null (job seekers)
    const validSubscriptions = subscriptions.filter(sub => sub.user !== null);

    return validSubscriptions.map(sub => ({
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

  async cancelUserSubscription(subscriptionId: string) {
    const subscription = await this.subscriptionModel.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.stripeSubscriptionId) {
      // Cancel in Stripe immediately (admin override)
      const Stripe = require('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    }

    subscription.status = 'cancelled' as any;
    subscription.autoRenew = false;
    await subscription.save();

    // Log admin action
    await this.activityService.logActivity(
      'SUBSCRIPTION_CANCELLED' as any,
      `Admin cancelled subscription for user ${subscription.user}`,
      'admin', // admin userId
      { 
        targetUserId: subscription.user.toString(),
        subscriptionId: subscriptionId,
        reason: 'Cancelled by admin' 
      }
    );

    return subscription;
  }

  async reactivateUserSubscription(subscriptionId: string) {
    const subscription = await this.subscriptionModel.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.status = 'active' as any;
    subscription.autoRenew = true;
    await subscription.save();

    // Log admin action
    await this.activityService.logActivity(
      'SUBSCRIPTION_CREATED' as any, // Using closest available type
      `Admin reactivated subscription for user ${subscription.user}`,
      'admin', // admin userId
      { 
        targetUserId: subscription.user.toString(),
        subscriptionId: subscriptionId,
        reason: 'Reactivated by admin' 
      }
    );

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
    // Get all subscriptions with populated users
    const allSubscriptions = await this.subscriptionModel
      .find()
      .populate({
        path: 'user',
        select: 'role',
        match: { role: { $in: ['employer', 'admin'] } }
      });

    // Filter out subscriptions where user is null (job seekers)
    const validSubscriptions = allSubscriptions.filter(sub => sub.user !== null);

    // Calculate stats from valid subscriptions
    const totalSubscriptions = validSubscriptions.length;
    const activeSubscriptions = validSubscriptions.filter(sub => sub.status === 'active').length;
    const cancelledSubscriptions = validSubscriptions.filter(sub => sub.status === 'cancelled').length;
    
    const planBreakdown = {
      free: validSubscriptions.filter(sub => sub.plan === 'free').length,
      basic: validSubscriptions.filter(sub => sub.plan === 'basic').length,
      pro: validSubscriptions.filter(sub => sub.plan === 'pro').length,
      enterprise: validSubscriptions.filter(sub => sub.plan === 'enterprise').length,
    };

    return {
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      planBreakdown,
    };
  }

  // ========== ADVANCED ANALYTICS MANAGEMENT ==========

  async getAllAnalyticsInsights(limit: number, page: number) {
    const skip = (page - 1) * limit;
    
    // For admin, get all insights without user restriction
    const query: any = {
      isActive: true,
    };

    const insights = await this.analyticsInsightModel
      .find(query)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email')
      .exec();

    const total = await this.analyticsInsightModel.countDocuments(query);

    return {
      insights,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserAnalyticsInsights(userId: string) {
    return await this.advancedAnalyticsService.getInsights(userId, { limit: 100 });
  }

  async archiveAnalyticsInsight(insightId: string) {
    // This would need to be implemented in the AdvancedAnalyticsService
    // For now, we'll just return success
    return { success: true };
  }

  // ========== API KEYS MANAGEMENT ==========

  async getAllApiKeys(limit: number, page: number) {
    const skip = (page - 1) * limit;
    
    const apiKeys = await this.apiKeyModel
      .find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.apiKeyModel.countDocuments();

    return {
      apiKeys,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async revokeApiKey(keyId: string) {
    await this.apiKeyModel.findByIdAndUpdate(keyId, { 
      isActive: false, 
      revokedAt: new Date() 
    });
  }

  // ========== SALARY DATA MANAGEMENT ==========

  async getSalaryDataStatus() {
    const updateStatus = this.salaryUpdateService.getUpdateStatus();
    const cacheStats = this.salaryUpdateService.getCacheStatistics();
    
    return {
      updateStatus,
      cacheStats,
    };
  }

  async triggerSalaryDataUpdate() {
    return await this.salaryUpdateService.triggerUpdate();
  }

  async clearSalaryDataCache() {
    this.salaryUpdateService.clearAllCaches();
  }

  // ========== INTERVIEW MANAGEMENT ==========

  async getAllInterviewTemplates(
    limit: number, 
    page: number, 
    search?: string, 
    industry?: string, 
    difficulty?: string, 
    isPublic?: string
  ) {
    const skip = (page - 1) * limit;
    const query: any = {};

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by industry
    if (industry && industry !== 'all') {
      query.industry = industry;
    }

    // Filter by difficulty
    if (difficulty && difficulty !== 'all') {
      query.difficulty = difficulty;
    }

    // Filter by public status
    if (isPublic && isPublic !== 'all') {
      query.isPublic = isPublic === 'true';
    }
    
    const templates = await this.interviewTemplateModel
      .find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.interviewTemplateModel.countDocuments(query);

    return {
      templates,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAllInterviewSessions(
    limit: number, 
    page: number, 
    search?: string, 
    status?: string, 
    type?: string
  ) {
    const skip = (page - 1) * limit;
    const query: any = {};

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by type
    if (type && type !== 'all') {
      query.type = type;
    }
    
    const sessions = await this.interviewSessionModel
      .find(query)
      .populate('interviewerId', 'name email')
      .populate('candidateId', 'name email')
      .populate('jobId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.interviewSessionModel.countDocuments(query);

    return {
      sessions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ========== ACCOUNT MANAGER MANAGEMENT ==========

  async getAllAccountManagers() {
    const managers = await this.accountManagerModel
      .find()
      .populate('assignedClients', 'name email company')
      .sort({ createdAt: -1 });

    return managers;
  }

  async assignAccountManager(managerId: string, userId: string) {
    await this.accountManagerModel.findByIdAndUpdate(managerId, {
      $addToSet: { assignedClients: userId }
    });
  }

  // ========== SUPPORT MANAGEMENT ==========

  async getAllSupportTickets(status?: string, priority?: string) {
    const query: any = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tickets = await this.supportTicketModel
      .find(query)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    return tickets;
  }

  async assignSupportTicket(ticketId: string, adminId: string) {
    await this.supportTicketModel.findByIdAndUpdate(ticketId, {
      assignedTo: adminId,
      status: 'assigned'
    });
  }

  // ========== WHITE-LABEL MANAGEMENT ==========

  async getAllWhiteLabelConfigurations(
    limit: number,
    page: number,
    search?: string,
    status?: string,
    type?: string,
    company?: string
  ) {
    const skip = (page - 1) * limit;
    const query: any = {};

    // Search functionality
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status && status !== 'all') {
      query.isActive = status === 'active';
    }

    // Filter by type
    if (type && type !== 'all') {
      if (type === 'white-label') {
        query.whiteLabelEnabled = true;
      } else if (type === 'custom') {
        query.whiteLabelEnabled = false;
      }
    }

    // Filter by company
    if (company && company !== 'all') {
      query.companyName = { $regex: company, $options: 'i' };
    }

    const configurations = await this.whiteLabelConfigModel
      .find(query)
      .populate('user', 'name email company')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.whiteLabelConfigModel.countDocuments(query);

    return {
      configurations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async approveWhiteLabelConfiguration(configId: string) {
    await this.whiteLabelConfigModel.findByIdAndUpdate(configId, {
      isActive: true,
      approvedAt: new Date()
    });
    return { success: true };
  }

  async rejectWhiteLabelConfiguration(configId: string, reason: string) {
    await this.whiteLabelConfigModel.findByIdAndUpdate(configId, {
      isActive: false,
      rejectionReason: reason,
      rejectedAt: new Date()
    });
    return { success: true };
  }

  // ========== MESSAGING MANAGEMENT ==========

  async getAllConversations(
    limit: number,
    page: number,
    search?: string,
    type?: string,
    status?: string
  ) {
    const skip = (page - 1) * limit;
    const query: any = {};

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'participants.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by type
    if (type && type !== 'all') {
      query.isAdminConversation = type === 'admin';
    }

    // Filter by status (active/inactive based on lastMessage)
    if (status && status !== 'all') {
      if (status === 'active') {
        query.lastMessage = { $exists: true };
      } else if (status === 'inactive') {
        query.lastMessage = { $exists: false };
      }
    }

    const conversations = await this.conversationModel
      .find(query)
      .populate('participants', 'name email role')
      .populate('lastMessage', 'content createdAt')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.conversationModel.countDocuments(query);

    return {
      conversations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getConversationMessages(conversationId: string, limit: number, page: number) {
    const skip = (page - 1) * limit;

    const messages = await this.messageModel
      .find({ conversation: conversationId })
      .populate('sender', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.messageModel.countDocuments({ conversation: conversationId });

    return {
      messages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMessagingStats() {
    const [
      totalConversations,
      activeConversations,
      totalMessages,
      messagesToday,
      adminConversations,
      userConversations
    ] = await Promise.all([
      this.conversationModel.countDocuments(),
      this.conversationModel.countDocuments({ lastMessage: { $exists: true } }),
      this.messageModel.countDocuments(),
      this.messageModel.countDocuments({
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }),
      this.conversationModel.countDocuments({ isAdminConversation: true }),
      this.conversationModel.countDocuments({ isAdminConversation: false })
    ]);

    return {
      totalConversations,
      activeConversations,
      totalMessages,
      messagesToday,
      adminConversations,
      userConversations,
      averageMessagesPerConversation: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0
    };
  }

  // ========== BRANDING MANAGEMENT ==========

  async getAllBrandingConfigurations(
    limit: number,
    page: number,
    search?: string,
    status?: string,
    type?: string,
    company?: string
  ) {
    const skip = (page - 1) * limit;
    const query: any = {};

    // Search functionality
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status && status !== 'all') {
      query.isActive = status === 'active';
    }

    // Filter by type
    if (type && type !== 'all') {
      if (type === 'white-label') {
        query.whiteLabelEnabled = true;
      } else if (type === 'custom') {
        query.whiteLabelEnabled = false;
      }
    }

    // Filter by company
    if (company && company !== 'all') {
      query.companyName = { $regex: company, $options: 'i' };
    }

    const configurations = await this.brandingModel
      .find(query)
      .populate('user', 'name email company')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.brandingModel.countDocuments(query);

    return {
      configurations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async approveBrandingConfiguration(configId: string) {
    await this.brandingModel.findByIdAndUpdate(configId, {
      isActive: true,
      approvedAt: new Date()
    });
  }

  async rejectBrandingConfiguration(configId: string, reason: string) {
    await this.brandingModel.findByIdAndUpdate(configId, {
      isActive: false,
      rejectionReason: reason,
      rejectedAt: new Date()
    });
  }

  async getBrandingStats() {
    const [
      totalConfigurations,
      activeConfigurations,
      pendingConfigurations,
      whiteLabelConfigurations,
      customConfigurations,
      configurationsThisMonth
    ] = await Promise.all([
      this.brandingModel.countDocuments(),
      this.brandingModel.countDocuments({ isActive: true }),
      this.brandingModel.countDocuments({ isActive: false }),
      this.brandingModel.countDocuments({ whiteLabelEnabled: true }),
      this.brandingModel.countDocuments({ whiteLabelEnabled: false }),
      this.brandingModel.countDocuments({
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      })
    ]);

    return {
      totalConfigurations,
      activeConfigurations,
      pendingConfigurations,
      whiteLabelConfigurations,
      customConfigurations,
      configurationsThisMonth,
      approvalRate: totalConfigurations > 0 ? Math.round((activeConfigurations / totalConfigurations) * 100) : 0
    };
  }

  // ========== CONTENT MODERATION ==========

  async getJobsForModeration(
    limit: number,
    page: number,
    search?: string,
    status?: string,
    type?: string
  ) {
    const skip = (page - 1) * limit;
    const query: any = {};

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'company.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by type
    if (type && type !== 'all') {
      query.jobType = type;
    }

    const jobs = await this.jobModel
      .find(query)
      .populate('postedBy', 'name email')
      .populate('company', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.jobModel.countDocuments(query);

    return {
      jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUsersForModeration(
    limit: number,
    page: number,
    search?: string,
    status?: string,
    role?: string
  ) {
    const skip = (page - 1) * limit;
    const query: any = {};

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status && status !== 'all') {
      query.isActive = status === 'active';
    }

    // Filter by role
    if (role && role !== 'all') {
      query.role = role;
    }

    const users = await this.userModel
      .find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.userModel.countDocuments(query);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getContentFlags(
    limit: number,
    page: number,
    search?: string,
    status?: string,
    priority?: string,
    type?: string
  ) {
    const skip = (page - 1) * limit;
    const query: any = {};

    // Search functionality
    if (search) {
      query.$or = [
        { reason: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { targetTitle: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by priority
    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    // Filter by type
    if (type && type !== 'all') {
      query.type = type;
    }

    const flags = await this.contentFlagModel
      .find(query)
      .populate('reporter', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.contentFlagModel.countDocuments(query);

    return {
      flags,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async moderateJob(jobId: string, action: string, reason?: string) {
    const updateData: any = {};

    switch (action) {
      case 'approve':
        updateData.status = 'active';
        break;
      case 'reject':
        updateData.status = 'closed';
        updateData.rejectionReason = reason;
        break;
      case 'flag':
        updateData.status = 'flagged';
        updateData.flagReason = reason;
        break;
      case 'suspend':
        updateData.status = 'suspended';
        updateData.suspensionReason = reason;
        break;
    }

    await this.jobModel.findByIdAndUpdate(jobId, updateData);
  }

  async moderateUser(userId: string, action: string, reason?: string) {
    const updateData: any = {};

    switch (action) {
      case 'suspend':
        updateData.isActive = false;
        updateData.suspensionReason = reason;
        updateData.suspendedAt = new Date();
        break;
      case 'activate':
        updateData.isActive = true;
        updateData.suspensionReason = undefined;
        updateData.suspendedAt = undefined;
        break;
    }

    await this.userModel.findByIdAndUpdate(userId, updateData);
  }

  async resolveContentFlag(flagId: string, action: string, reason?: string) {
    // Mock implementation since we don't have a flags schema yet
    console.log(`Resolving flag ${flagId} with action ${action} and reason ${reason}`);
    return { success: true };
  }

  async getModerationStats() {
    const [
      totalJobs,
      flaggedJobs,
      totalUsers,
      suspendedUsers,
      totalApplications,
      flaggedApplications
    ] = await Promise.all([
      this.jobModel.countDocuments(),
      this.jobModel.countDocuments({ status: 'flagged' }),
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ isActive: false }),
      this.applicationModel.countDocuments(),
      this.applicationModel.countDocuments({ status: 'flagged' })
    ]);

    return {
      totalJobs,
      flaggedJobs,
      totalUsers,
      suspendedUsers,
      totalApplications,
      flaggedApplications,
      moderationRate: totalJobs > 0 ? Math.round((flaggedJobs / totalJobs) * 100) : 0,
      userSuspensionRate: totalUsers > 0 ? Math.round((suspendedUsers / totalUsers) * 100) : 0
    };
  }
}

