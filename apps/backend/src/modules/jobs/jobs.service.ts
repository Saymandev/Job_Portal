import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';
import { AuditAction, AuditResource } from '@/common/schemas/audit-log.schema';
import { AuditService } from '@/common/services/audit.service';
import { SanitizationService } from '@/common/services/sanitization.service';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { EnhancedNotificationsService } from '../notifications/enhanced-notifications.service';
import { Subscription, SubscriptionDocument, SubscriptionPlan } from '../subscriptions/schemas/subscription.schema';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateJobDto } from './dto/create-job.dto';
import { SearchJobsDto } from './dto/search-jobs.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Job, JobDocument, JobStatus } from './schemas/job.schema';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private auditService: AuditService,
    private sanitizationService: SanitizationService,
    private enhancedNotificationsService: EnhancedNotificationsService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async create(userId: string, createJobDto: CreateJobDto, req?: Request): Promise<{ job: JobDocument; autoPosted: boolean; subscriptionInfo: any }> {
    try {
      // Sanitize input data
      const sanitizedDto = {
        ...createJobDto,
        title: this.sanitizationService.sanitizeText(createJobDto.title),
        description: this.sanitizationService.sanitizeJobContent(createJobDto.description),
        requirements: this.sanitizationService.sanitizeJobContent(createJobDto.requirements),
        location: this.sanitizationService.sanitizeText(createJobDto.location),
        skills: createJobDto.skills.map(skill => this.sanitizationService.sanitizeText(skill)),
        benefits: createJobDto.benefits?.map(benefit => this.sanitizationService.sanitizeText(benefit)) || [],
      };

      // Find user's company
      const company = await this.companyModel.findOne({ owner: userId });
      if (!company) {
        await this.auditService.log(
          userId,
          AuditAction.CREATE_JOB,
          AuditResource.JOB,
          'unknown',
          { error: 'Company not found' },
          req,
          false,
          'Company not found. Please create a company first.'
        );
        throw new NotFoundException('Company not found. Please create a company first.');
      }

    // Get user to check role
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Job seekers cannot post jobs
    if (user.role === 'job_seeker') {
      throw new ForbiddenException('Job seekers cannot post jobs. Only employers can post jobs.');
    }

    // Check subscription limits (only for employers)
    const subscription = await this.subscriptionsService.getUserSubscription(userId);

    // Employers must have a subscription
    if (user.role === 'employer' && !subscription) {
      throw new NotFoundException('Subscription not found. Please contact support.');
    }

    // Check if user has reached their job posting limit
    const currentJobCount = await this.jobModel.countDocuments({ 
      postedBy: userId, 
      status: { $in: ['open', 'paused'] } 
    });

    let autoPosted = false;
    let finalStatus = createJobDto.status;

    // Determine if job should be auto-posted based on subscription plan
    if (subscription.plan === SubscriptionPlan.FREE) {
      // Free plan: Check if user has reached limit
      if (currentJobCount >= subscription.jobPostsLimit) {
        throw new ForbiddenException(
          `You have reached your job posting limit of ${subscription.jobPostsLimit} for the FREE plan. Upgrade your subscription to post more jobs.`
        );
      }
      // Free plan jobs are auto-posted (no approval needed)
      autoPosted = true;
      finalStatus = JobStatus.OPEN;
    } else {
      // Paid plans: Check if user has reached limit
      if (currentJobCount >= subscription.jobPostsLimit) {
        throw new ForbiddenException(
          `You have reached your job posting limit of ${subscription.jobPostsLimit} for the ${subscription.plan.toUpperCase()} plan. Upgrade your subscription to post more jobs.`
        );
      }
      // Paid plan jobs are auto-posted (premium feature)
      autoPosted = true;
      finalStatus = JobStatus.OPEN;
    }

    // Set expiration date based on subscription plan
    const jobDurationDays = this.getJobDurationDays(subscription.plan);
    const expiresAt = createJobDto.applicationDeadline || new Date(Date.now() + jobDurationDays * 24 * 60 * 60 * 1000);

      const job = await this.jobModel.create({
        ...sanitizedDto,
        status: finalStatus,
        company: company._id,
        postedBy: userId,
        expiresAt,
      });

      // Increment job posts used counter
      await this.subscriptionModel.findOneAndUpdate(
        { user: userId },
        { $inc: { jobPostsUsed: 1 } }
      );

      const populatedJob = await job.populate(['company', 'postedBy']);

      // Log successful job creation
      await this.auditService.log(
        userId,
        AuditAction.CREATE_JOB,
        AuditResource.JOB,
        job._id.toString(),
        {
          title: sanitizedDto.title,
          company: company._id,
          autoPosted,
          subscriptionPlan: subscription.plan,
        },
        req,
        true
      );

      // Send notification about new job posting (if auto-posted)
      if (autoPosted) {
        await this.enhancedNotificationsService.notifyNewJobPosted(job._id.toString());
      }

      return {
        job: populatedJob,
        autoPosted,
        subscriptionInfo: {
          plan: subscription.plan,
          jobPostsLimit: subscription.jobPostsLimit,
          jobPostsUsed: subscription.jobPostsUsed + 1,
          remainingJobs: subscription.jobPostsLimit - (subscription.jobPostsUsed + 1),
        },
      };
    } catch (error) {
      // Log failed job creation
      await this.auditService.log(
        userId,
        AuditAction.CREATE_JOB,
        AuditResource.JOB,
        'unknown',
        { error: error.message },
        req,
        false,
        error.message
      );
      throw error;
    }
  }

  async findAll(searchJobsDto: SearchJobsDto): Promise<PaginatedResult<any>> {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      location, 
      jobType, 
      experienceLevel, 
      isRemote, 
      minSalary, 
      maxSalary, 
      skills, 
      companySize, 
      tags, 
      sortBy,
      featured
    } = searchJobsDto;

    // Limit the number of results to prevent very large queries
    const maxLimit = Math.min(limit, 50);
    const maxPage = Math.min(page, 100);

    const query: any = { status: 'open' };

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Filters
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (jobType) {
      query.jobType = jobType;
    }

    if (experienceLevel) {
      query.experienceLevel = experienceLevel;
    }

    if (isRemote !== undefined) {
      query.isRemote = isRemote;
    }

    if (minSalary) {
      query.salaryMin = { $gte: minSalary };
    }

    if (maxSalary) {
      query.salaryMax = { $lte: maxSalary };
    }

    if (skills && skills.length > 0) {
      query.skills = { $in: skills };
    }

    if (companySize) {
      // For now, we'll store company size as a string in the job document
      // In a real app, this would be populated from the company document
      query.companySize = companySize;
    }

    if (tags && tags.length > 0) {
      // For tags, we'll search in the job title, description, and skills
      query.$or = [
        { title: { $regex: tags.join('|'), $options: 'i' } },
        { description: { $regex: tags.join('|'), $options: 'i' } },
        { skills: { $in: tags } }
      ];
    }

    if (featured !== undefined) {
      query.isFeatured = featured;
    }

    // Build sort criteria
    let sortCriteria: any = { isFeatured: -1, createdAt: -1 }; // Default sort
    
    if (sortBy) {
      switch (sortBy) {
        case 'date':
          sortCriteria = { createdAt: -1 };
          break;
        case 'salary':
          sortCriteria = { salaryMax: -1, salaryMin: -1 };
          break;
        case 'company':
          sortCriteria = { 'company.name': 1 };
          break;
        case 'title':
          sortCriteria = { title: 1 };
          break;
        case 'relevance':
        default:
          sortCriteria = { isFeatured: -1, createdAt: -1 };
          break;
      }
    }

    const skip = (maxPage - 1) * maxLimit;

    // Optimize the query by using lean() for better performance
    const [data, total] = await Promise.all([
      this.jobModel
        .find(query)
        .populate('company', 'name logo location')
        .sort(sortCriteria)
        .skip(skip)
        .limit(maxLimit)
        .lean() // Use lean() for better performance
        .exec(),
      this.jobModel.countDocuments(query),
    ]);

    return {
      data,
      meta: {
        total,
        page: maxPage,
        limit: maxLimit,
        totalPages: Math.ceil(total / maxLimit),
        hasNextPage: maxPage < Math.ceil(total / maxLimit),
        hasPrevPage: maxPage > 1,
      },
    };
  }

  async findById(id: string): Promise<JobDocument> {
    const job = await this.jobModel
      .findById(id)
      .populate('company')
      .populate('postedBy', 'fullName email');

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Increment views count
    job.viewsCount += 1;
    await job.save();

    return job;
  }

  async findByCompany(companyId: string): Promise<JobDocument[]> {
    return this.jobModel.find({ company: companyId }).sort({ createdAt: -1 });
  }

  async findByEmployer(userId: string): Promise<any[]> {
    const jobs = await this.jobModel.find({ postedBy: userId }).populate('company').sort({ createdAt: -1 });
    
    // Get accurate application counts for each job
    const jobsWithCounts = await Promise.all(
      jobs.map(async (job) => {
        const { Application } = await import('../applications/schemas/application.schema');
        const ApplicationModel = this.jobModel.db.model('Application');
        
        const applicationsCount = await ApplicationModel.countDocuments({ job: job._id });
        
        return {
          ...job.toObject(),
          applicationsCount
        };
      })
    );
    
    return jobsWithCounts;
  }

  async findRecentByEmployer(userId: string, limit: number = 5): Promise<any[]> {
    const jobs = await this.jobModel
      .find({ postedBy: userId })
      .populate('company', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    // Get accurate application counts for each job
    const jobsWithCounts = await Promise.all(
      jobs.map(async (job) => {
        const { Application } = await import('../applications/schemas/application.schema');
        const ApplicationModel = this.jobModel.db.model('Application');
        
        const applicationsCount = await ApplicationModel.countDocuments({ job: job._id });
        
        return {
          ...job,
          applicationsCount,
          views: job.viewsCount || 0,
          postedAt: job.createdAt,
          expiresAt: job.applicationDeadline,
        };
      })
    );
    
    return jobsWithCounts;
  }

  async findRecentByEmployerPaginated(userId: string, page: number = 1, limit: number = 10): Promise<PaginatedResult<any>> {
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      this.jobModel
        .find({ postedBy: userId })
        .populate('company', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.jobModel.countDocuments({ postedBy: userId }),
    ]);
    
    // Get accurate application counts for each job
    const { Application } = await import('../applications/schemas/application.schema');
    const ApplicationModel = this.jobModel.db.model('Application');
    
    const data = await Promise.all(
      jobs.map(async (job) => {
        const applicationsCount = await ApplicationModel.countDocuments({ job: job._id });
        
        return {
          ...job,
          applicationsCount,
          views: job.viewsCount || 0,
          postedAt: job.createdAt,
          expiresAt: job.applicationDeadline,
        };
      })
    );
    
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async update(id: string, userId: string, updateJobDto: UpdateJobDto): Promise<JobDocument> {
    const job = await this.jobModel.findById(id);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.postedBy.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to update this job');
    }

    Object.assign(job, updateJobDto);
    await job.save();

    return job.populate(['company', 'postedBy']);
  }

  async delete(id: string, userId: string): Promise<void> {
    const job = await this.jobModel.findById(id);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.postedBy.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to delete this job');
    }

    await job.deleteOne();
  }

  async incrementApplicationCount(jobId: string): Promise<void> {
    await this.jobModel.findByIdAndUpdate(jobId, { $inc: { applicationsCount: 1 } });
  }

  async recalculateApplicationCount(jobId: string): Promise<void> {
    // Import Application model dynamically to avoid circular dependency
    const { Application } = await import('../applications/schemas/application.schema');
    const ApplicationModel = this.jobModel.db.model('Application');
    
    const count = await ApplicationModel.countDocuments({ job: jobId });
    await this.jobModel.findByIdAndUpdate(jobId, { applicationsCount: count });
  }

  async recalculateAllApplicationCounts(): Promise<void> {
    const { Application } = await import('../applications/schemas/application.schema');
    const ApplicationModel = this.jobModel.db.model('Application');
    
    const jobs = await this.jobModel.find({});
    
    for (const job of jobs) {
      const count = await ApplicationModel.countDocuments({ job: job._id });
      await this.jobModel.findByIdAndUpdate(job._id, { applicationsCount: count });
    }
  }

  async expireJobs(): Promise<void> {
    await this.jobModel.updateMany(
      {
        expiresAt: { $lt: new Date() },
        status: 'open',
      },
      {
        status: 'expired',
      },
    );
  }

  async getStats(): Promise<any> {
    const [total, open, closed, byType] = await Promise.all([
      this.jobModel.countDocuments(),
      this.jobModel.countDocuments({ status: 'open' }),
      this.jobModel.countDocuments({ status: 'closed' }),
      this.jobModel.aggregate([
        { $group: { _id: '$jobType', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      open,
      closed,
      byType,
    };
  }

  private getJobDurationDays(plan: SubscriptionPlan): number {
    switch (plan) {
      case SubscriptionPlan.FREE:
        return 30; // 30 days
      case SubscriptionPlan.BASIC:
        return 60; // 60 days
      case SubscriptionPlan.PRO:
        return 90; // 90 days
      case SubscriptionPlan.ENTERPRISE:
        return 90; // 90 days (can be customized later)
      default:
        return 30;
    }
  }
}

