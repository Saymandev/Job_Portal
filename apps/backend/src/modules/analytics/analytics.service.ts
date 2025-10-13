import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from '../applications/schemas/application.schema';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
  ) {}

  // ========== EMPLOYER ANALYTICS ==========

  async getEmployerAnalytics(userId: string): Promise<any> {
    const jobs = await this.jobModel.find({ postedBy: userId });
    const jobIds = jobs.map(job => job._id);

    const [
      totalApplications,
      applicationsByStatus,
      applicationsTrend,
      topPerformingJobs,
      conversionMetrics,
      timeToHireMetrics,
    ] = await Promise.all([
      this.getTotalApplications(jobIds),
      this.getApplicationsByStatus(jobIds),
      this.getApplicationsTrend(jobIds),
      this.getTopPerformingJobs(jobIds),
      this.getConversionMetrics(jobIds),
      this.getTimeToHireMetrics(jobIds),
    ]);

    return {
      overview: {
        totalJobs: jobs.length,
        activeJobs: jobs.filter(j => j.status === 'open').length,
        totalApplications,
        applicationsByStatus,
      },
      trends: applicationsTrend,
      topPerformingJobs,
      conversion: conversionMetrics,
      timeToHire: timeToHireMetrics,
    };
  }

  async getJobAnalytics(jobId: string): Promise<any> {
    const job = await this.jobModel.findById(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const applications = await this.applicationModel.find({ job: jobId });

    const applicationsByStatus = applications.reduce((acc: any, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    const viewsOverTime = await this.getJobViewsOverTime(jobId);
    const applicationsOverTime = await this.getApplicationsOverTime(jobId);
    const candidateSourceAnalysis = await this.getCandidateSourceAnalysis(applications);

    return {
      overview: {
        totalViews: job.viewsCount,
        totalApplications: job.applicationsCount,
        applicationsByStatus,
        conversionRate: job.viewsCount > 0 ? (job.applicationsCount / job.viewsCount) * 100 : 0,
      },
      viewsOverTime,
      applicationsOverTime,
      candidateSourceAnalysis,
    };
  }

  // ========== ADMIN ANALYTICS ==========

  async getAdminAnalytics(): Promise<any> {
    const [
      platformOverview,
      userGrowth,
      jobsGrowth,
      applicationsGrowth,
      topCompanies,
      topJobCategories,
      platformHealth,
    ] = await Promise.all([
      this.getPlatformOverview(),
      this.getUserGrowth(),
      this.getJobsGrowth(),
      this.getApplicationsGrowth(),
      this.getTopCompanies(),
      this.getTopJobCategories(),
      this.getPlatformHealth(),
    ]);

    return {
      overview: platformOverview,
      growth: {
        users: userGrowth,
        jobs: jobsGrowth,
        applications: applicationsGrowth,
      },
      topPerformers: {
        companies: topCompanies,
        jobCategories: topJobCategories,
      },
      platformHealth,
    };
  }

  // ========== HELPER METHODS ==========

  private async getTotalApplications(jobIds: any[]): Promise<number> {
    return this.applicationModel.countDocuments({ job: { $in: jobIds } });
  }

  private async getApplicationsByStatus(jobIds: any[]): Promise<any> {
    const applications = await this.applicationModel.find({ job: { $in: jobIds } });
    return applications.reduce((acc: any, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});
  }

  private async getApplicationsTrend(jobIds: any[]): Promise<any[]> {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const applications = await this.applicationModel.find({
      job: { $in: jobIds },
      createdAt: { $gte: last30Days },
    });

    // Group by date
    const trend = applications.reduce((acc: any, app) => {
      const date = app.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(trend).map(([date, count]) => ({ date, count }));
  }

  private async getTopPerformingJobs(jobIds: any[]): Promise<any[]> {
    const jobs = await this.jobModel
      .find({ _id: { $in: jobIds } })
      .sort({ applicationsCount: -1 })
      .limit(5)
      .populate('company', 'name')
      .exec();

    return jobs.map(job => ({
      jobId: job._id,
      title: job.title,
      company: (job.company as any)?.name,
      applications: job.applicationsCount,
      views: job.viewsCount,
      conversionRate: job.viewsCount > 0 ? (job.applicationsCount / job.viewsCount) * 100 : 0,
    }));
  }

  private async getConversionMetrics(jobIds: any[]): Promise<any> {
    const applications = await this.applicationModel.find({ job: { $in: jobIds } });
    const totalApplications = applications.length;

    const conversions = {
      applied: totalApplications,
      reviewing: applications.filter(a => a.status === 'reviewing').length,
      shortlisted: applications.filter(a => a.status === 'shortlisted').length,
      interviewed: applications.filter(a => a.status === 'interviewed' || a.status === 'interview_scheduled').length,
      hired: applications.filter(a => a.status === 'accepted').length,
    };

    return {
      ...conversions,
      conversionRates: {
        toReview: totalApplications > 0 ? (conversions.reviewing / totalApplications) * 100 : 0,
        toShortlist: totalApplications > 0 ? (conversions.shortlisted / totalApplications) * 100 : 0,
        toInterview: totalApplications > 0 ? (conversions.interviewed / totalApplications) * 100 : 0,
        toHire: totalApplications > 0 ? (conversions.hired / totalApplications) * 100 : 0,
      },
    };
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

  private async getJobViewsOverTime(jobId: string): Promise<any[]> {
    // This would typically be stored in a separate analytics collection
    // For now, returning sample data structure
    return [];
  }

  private async getApplicationsOverTime(jobId: string): Promise<any[]> {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const applications = await this.applicationModel.find({
      job: jobId,
      createdAt: { $gte: last30Days },
    });

    const trend = applications.reduce((acc: any, app) => {
      const date = app.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(trend).map(([date, count]) => ({ date, count }));
  }

  private async getCandidateSourceAnalysis(applications: ApplicationDocument[]): Promise<any> {
    // In a real app, you'd track where candidates came from (organic search, referral, etc.)
    // For now, returning sample structure
    return {
      organic: applications.length * 0.6,
      referral: applications.length * 0.2,
      social: applications.length * 0.15,
      other: applications.length * 0.05,
    };
  }

  private async getPlatformOverview(): Promise<any> {
    const [totalUsers, totalJobs, totalApplications, totalCompanies] = await Promise.all([
      this.userModel.countDocuments(),
      this.jobModel.countDocuments(),
      this.applicationModel.countDocuments(),
      this.companyModel.countDocuments(),
    ]);

    const activeJobs = await this.jobModel.countDocuments({ status: 'open' });
    const pendingApplications = await this.applicationModel.countDocuments({ status: 'pending' });

    return {
      totalUsers,
      totalJobs,
      totalApplications,
      totalCompanies,
      activeJobs,
      pendingApplications,
    };
  }

  private async getUserGrowth(): Promise<any[]> {
    const last12Months = new Date();
    last12Months.setMonth(last12Months.getMonth() - 12);

    const users = await this.userModel.find({
      createdAt: { $gte: last12Months },
    });

    const growth = users.reduce((acc: any, user) => {
      const month = user.createdAt.toISOString().substring(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(growth).map(([month, count]) => ({ month, count }));
  }

  private async getJobsGrowth(): Promise<any[]> {
    const last12Months = new Date();
    last12Months.setMonth(last12Months.getMonth() - 12);

    const jobs = await this.jobModel.find({
      createdAt: { $gte: last12Months },
    });

    const growth = jobs.reduce((acc: any, job) => {
      const month = job.createdAt.toISOString().substring(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(growth).map(([month, count]) => ({ month, count }));
  }

  private async getApplicationsGrowth(): Promise<any[]> {
    const last12Months = new Date();
    last12Months.setMonth(last12Months.getMonth() - 12);

    const applications = await this.applicationModel.find({
      createdAt: { $gte: last12Months },
    });

    const growth = applications.reduce((acc: any, app) => {
      const month = app.createdAt.toISOString().substring(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(growth).map(([month, count]) => ({ month, count }));
  }

  private async getTopCompanies(): Promise<any[]> {
    const companies = await this.companyModel.find();
    
    const companiesWithJobs = await Promise.all(
      companies.map(async (company) => {
        const jobCount = await this.jobModel.countDocuments({ company: company._id });
        const jobs = await this.jobModel.find({ company: company._id });
        const jobIds = jobs.map(j => j._id);
        const applicationCount = await this.applicationModel.countDocuments({ job: { $in: jobIds } });

        return {
          companyId: company._id,
          name: company.name,
          jobCount,
          applicationCount,
        };
      })
    );

    return companiesWithJobs
      .sort((a, b) => b.applicationCount - a.applicationCount)
      .slice(0, 10);
  }

  private async getTopJobCategories(): Promise<any[]> {
    const jobs = await this.jobModel.find();
    
    const categories = jobs.reduce((acc: any, job) => {
      acc[job.jobType] = (acc[job.jobType] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(categories)
      .map(([category, count]) => ({ category, count }))
      .sort((a: any, b: any) => b.count - a.count);
  }

  private async getPlatformHealth(): Promise<any> {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      activeUsersLast7Days,
      activeUsersLast30Days,
      newJobsLast7Days,
      newApplicationsLast7Days,
    ] = await Promise.all([
      this.userModel.countDocuments({ 
        updatedAt: { $gte: last7Days } 
      }),
      this.userModel.countDocuments({ 
        updatedAt: { $gte: last30Days } 
      }),
      this.jobModel.countDocuments({ 
        createdAt: { $gte: last7Days } 
      }),
      this.applicationModel.countDocuments({ 
        createdAt: { $gte: last7Days } 
      }),
    ]);

    return {
      activeUsersLast7Days,
      activeUsersLast30Days,
      newJobsLast7Days,
      newApplicationsLast7Days,
      healthScore: this.calculateHealthScore({
        activeUsersLast7Days,
        newJobsLast7Days,
        newApplicationsLast7Days,
      }),
    };
  }

  private calculateHealthScore(metrics: any): number {
    // Simple health score calculation (0-100)
    let score = 50;
    
    if (metrics.activeUsersLast7Days > 10) score += 15;
    if (metrics.newJobsLast7Days > 5) score += 15;
    if (metrics.newApplicationsLast7Days > 10) score += 20;
    
    return Math.min(score, 100);
  }

  // ========== JOB SEEKER ANALYTICS ==========

  async getJobSeekerAnalytics(userId: string): Promise<any> {
    const applications = await this.applicationModel.find({ applicant: userId });

    const applicationsByStatus = applications.reduce((acc: any, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    const applicationsTrend = await this.getJobSeekerApplicationsTrend(userId);
    const responseRate = this.calculateResponseRate(applications);
    const averageResponseTime = this.calculateAverageResponseTime(applications);

    return {
      overview: {
        totalApplications: applications.length,
        applicationsByStatus,
        responseRate,
        averageResponseTime,
      },
      trends: applicationsTrend,
      topAppliedCategories: await this.getTopAppliedCategories(applications),
    };
  }

  private async getJobSeekerApplicationsTrend(userId: string): Promise<any[]> {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const applications = await this.applicationModel.find({
      applicant: userId,
      createdAt: { $gte: last30Days },
    });

    const trend = applications.reduce((acc: any, app) => {
      const date = app.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(trend).map(([date, count]) => ({ date, count }));
  }

  private calculateResponseRate(applications: ApplicationDocument[]): number {
    if (applications.length === 0) return 0;
    
    const responded = applications.filter(
      app => app.status !== 'pending'
    ).length;

    return (responded / applications.length) * 100;
  }

  private calculateAverageResponseTime(applications: ApplicationDocument[]): number {
    const respondedApps = applications.filter(app => app.status !== 'pending');
    
    if (respondedApps.length === 0) return 0;

    const totalTime = respondedApps.reduce((sum, app) => {
      const created = new Date(app.createdAt);
      const updated = new Date(app.updatedAt);
      return sum + (updated.getTime() - created.getTime());
    }, 0);

    return Math.round(totalTime / respondedApps.length / (1000 * 60 * 60 * 24)); // Convert to days
  }

  private async getTopAppliedCategories(applications: ApplicationDocument[]): Promise<any[]> {
    const jobs = await this.jobModel.find({
      _id: { $in: applications.map(a => a.job) },
    });

    const categories = jobs.reduce((acc: any, job) => {
      acc[job.jobType] = (acc[job.jobType] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(categories)
      .map(([category, count]) => ({ category, count }))
      .sort((a: any, b: any) => b.count - a.count);
  }
}
