import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from '../applications/schemas/application.schema';
import { Interview, InterviewDocument } from '../interviews/schemas/interview.schema';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Interview.name) private interviewModel: Model<InterviewDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // ========== EMPLOYER DASHBOARD ==========

  async getEmployerStats(userId: string): Promise<any> {
    // Get all jobs posted by this employer
    const jobs = await this.jobModel.find({ postedBy: userId });
    const jobIds = jobs.map(job => job._id);

    // Get current week date range
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    // Fetch all required stats in parallel
    const [
      totalApplications,
      pendingApplications,
      interviewsScheduled,
      hiredCandidates,
      profileViews,
    ] = await Promise.all([
      this.applicationModel.countDocuments({ job: { $in: jobIds } }),
      this.applicationModel.countDocuments({ job: { $in: jobIds }, status: 'pending' }),
      this.interviewModel.countDocuments({
        job: { $in: jobIds },
        scheduledDate: { $gte: startOfWeek, $lte: endOfWeek },
        status: { $in: ['scheduled', 'confirmed'] },
      }),
      this.applicationModel.countDocuments({
        job: { $in: jobIds },
        status: 'accepted',
        updatedAt: { $gte: new Date(new Date().setDate(1)) }, // This month
      }),
      this.calculateProfileViews(jobs),
    ]);

    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(job => job.status === 'open').length,
      totalApplications,
      pendingApplications,
      interviewsScheduled,
      pendingRescheduleRequests: 0, // Will be set by controller if needed
      hiredCandidates,
      profileViews,
      teamMembers: 1, // Default value, can be enhanced later
    };
  }

  async getEmployerAnalytics(userId: string): Promise<any> {
    // Get all jobs posted by this employer
    const jobs = await this.jobModel.find({ postedBy: userId });
    const jobIds = jobs.map(job => job._id);

    // Get date ranges
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Fetch analytics data
    const [
      applicationsThisMonth,
      applicationsLastMonth,
      topPerformingJobs,
      timeToHireMetrics,
      totalApplications,
    ] = await Promise.all([
      this.applicationModel.countDocuments({
        job: { $in: jobIds },
        createdAt: { $gte: startOfThisMonth },
      }),
      this.applicationModel.countDocuments({
        job: { $in: jobIds },
        createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      }),
      this.getTopPerformingJobs(jobIds),
      this.getTimeToHireMetrics(jobIds),
      this.applicationModel.countDocuments({ job: { $in: jobIds } }),
    ]);

    // Calculate conversion rate (applications per view)
    const totalViews = await this.jobModel.aggregate([
      { $match: { postedBy: userId } },
      { $group: { _id: null, totalViews: { $sum: '$viewsCount' } } }
    ]);
    const viewsCount = totalViews.length > 0 ? totalViews[0].totalViews : 0;
    const conversionRate = viewsCount > 0 ? (totalApplications / viewsCount) * 100 : 0;

    return {
      applicationsThisMonth,
      applicationsLastMonth,
      conversionRate: Math.round(conversionRate * 10) / 10, // Round to 1 decimal
      averageTimeToHire: timeToHireMetrics.averageDays,
      topPerformingJobs,
    };
  }

  async getRecentJobs(userId: string, page: number = 1, limit: number = 10): Promise<PaginatedResult<any>> {
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      this.jobModel
        .find({ postedBy: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('company', 'name')
        .lean(),
      this.jobModel.countDocuments({ postedBy: userId }),
    ]);

    const data = jobs.map(job => ({
      _id: job._id,
      title: job.title,
      status: job.status,
      applicationsCount: job.applicationsCount || 0,
      views: job.viewsCount || 0,
      postedAt: job.createdAt,
      expiresAt: job.applicationDeadline,
    }));

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

  async getRecentCandidates(userId: string, page: number = 1, limit: number = 10): Promise<PaginatedResult<any>> {
    // Get all jobs posted by this employer
    const jobs = await this.jobModel.find({ postedBy: userId });
    const jobIds = jobs.map(job => job._id);

    const skip = (page - 1) * limit;

    // Get recent applications with pagination
    const [applications, total] = await Promise.all([
      this.applicationModel
        .find({ job: { $in: jobIds } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('applicant', 'fullName email avatar phone location skills')
        .populate('job', 'title location')
        .lean(),
      this.applicationModel.countDocuments({ job: { $in: jobIds } }),
    ]);

    const data = applications.map(app => {
      const applicant = app.applicant as any;
      const job = app.job as any;
      
      return {
        _id: app._id,
        user: {
          _id: applicant?._id,
          fullName: applicant?.fullName || 'Unknown Applicant',
          email: applicant?.email || '',
          avatar: applicant?.avatar,
          phone: applicant?.phone,
          location: applicant?.location,
          skills: applicant?.skills || [],
        },
        job: {
          _id: job?._id,
          title: job?.title || 'Unknown Job',
          location: job?.location,
        },
        status: app.status,
        appliedAt: app.createdAt,
        resume: app.resume,
        score: undefined, // Can be calculated later if needed
      };
    });

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

  // ========== JOB SEEKER DASHBOARD ==========

  async getJobSeekerStats(userId: string): Promise<any> {
    const [
      totalApplications,
      pendingApplications,
      interviewsScheduled,
      profileViews,
      savedJobsCount,
    ] = await Promise.all([
      this.applicationModel.countDocuments({ applicant: userId }),
      this.applicationModel.countDocuments({ applicant: userId, status: 'pending' }),
      this.interviewModel.countDocuments({
        candidate: userId,
        status: { $in: ['scheduled', 'confirmed'] },
      }),
      this.getJobSeekerProfileViews(userId),
      this.getSavedJobsCount(userId),
    ]);

    return {
      totalApplications,
      pendingApplications,
      interviewsScheduled,
      profileViews,
      profileCompletion: await this.calculateProfileCompletion(userId),
      savedJobs: savedJobsCount,
      unreadMessages: 0, // Can be enhanced later
    };
  }

  // ========== HELPER METHODS ==========

  private calculateProfileViews(jobs: any[]): number {
    // Sum up views from all jobs
    return jobs.reduce((total, job) => total + (job.viewsCount || 0), 0);
  }

  private async getTopPerformingJobs(jobIds: any[]): Promise<any[]> {
    const jobs = await this.jobModel
      .find({ _id: { $in: jobIds } })
      .sort({ applicationsCount: -1 })
      .limit(5)
      .populate('company', 'name')
      .lean();

    return jobs.map(job => ({
      _id: job._id,
      title: job.title,
      status: job.status,
      applicationsCount: job.applicationsCount || 0,
      views: job.viewsCount || 0,
      postedAt: job.createdAt,
    }));
  }

  private async getTimeToHireMetrics(jobIds: any[]): Promise<any> {
    const hiredApplications = await this.applicationModel.find({
      job: { $in: jobIds },
      status: 'accepted',
    });

    if (hiredApplications.length === 0) {
      return { averageDays: 0, fastestDays: 0, slowestDays: 0 };
    }

    const timeDifferences = hiredApplications.map(app => {
      const created = new Date(app.createdAt);
      const updated = new Date(app.updatedAt);
      return Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    });

    return {
      averageDays: Math.round(timeDifferences.reduce((a, b) => a + b, 0) / timeDifferences.length),
      fastestDays: Math.min(...timeDifferences),
      slowestDays: Math.max(...timeDifferences),
    };
  }

  private async getJobSeekerProfileViews(userId: string): Promise<number> {
    const user = await this.userModel.findById(userId);
    return user?.profileViews || 0;
  }

  private async getSavedJobsCount(userId: string): Promise<number> {
    // This would require a SavedJob model - for now return 0
    // Can be enhanced when SavedJob model is integrated
    return 0;
  }

  private async calculateProfileCompletion(userId: string): Promise<number> {
    const user = await this.userModel.findById(userId);
    if (!user) return 0;

    let completion = 0;
    const fields = [
      'fullName',
      'email',
      'phone',
      'location',
      'bio',
      'skills',
      'experience',
      'education',
    ];

    fields.forEach(field => {
      const value = (user as any)[field];
      if (value) {
        if (Array.isArray(value)) {
          if (value.length > 0) completion += 100 / fields.length;
        } else if (typeof value === 'string' && value.trim()) {
          completion += 100 / fields.length;
        } else if (typeof value === 'object' && value !== null) {
          completion += 100 / fields.length;
        }
      }
    });

    return Math.round(completion);
  }
}

