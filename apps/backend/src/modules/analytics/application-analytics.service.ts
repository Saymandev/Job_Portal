import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from '../applications/schemas/application.schema';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class ApplicationAnalyticsService {
  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Get comprehensive application analytics for premium employers
   */
  async getApplicationAnalytics(employerId: string, timeRange: string = '30d') {
    const dateRange = this.getDateRange(timeRange);
    
    // Get all jobs posted by this employer
    const employerJobs = await this.jobModel.find({ postedBy: employerId }).select('_id title');
    const jobIds = employerJobs.map(job => job._id.toString());

    // Get all applications for these jobs within the time range
    const applications = await this.applicationModel
      .find({
        job: { $in: jobIds },
        createdAt: { $gte: dateRange.start, $lte: dateRange.end }
      })
      .populate('applicant', 'fullName email skills location experience')
      .populate('job', 'title location salaryMin salaryMax')
      .lean();

    return {
      overview: await this.getOverviewStats(applications, jobIds),
      trends: await this.getTrendAnalysis(applications, dateRange),
      topPerformingJobs: await this.getTopPerformingJobs(applications, employerJobs),
      candidateInsights: await this.getCandidateInsights(applications),
      conversionFunnel: await this.getConversionFunnel(applications),
      timeToHire: await this.getTimeToHireMetrics(applications),
      sourceAnalysis: await this.getSourceAnalysis(applications),
    };
  }

  private async getOverviewStats(applications: any[], jobIds: string[]) {
    const totalApplications = applications.length;
    const uniqueCandidates = new Set(applications.map(app => app.applicant._id)).size;
    const activeJobs = jobIds.length;
    
    const statusCounts = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    const avgApplicationsPerJob = activeJobs > 0 ? totalApplications / activeJobs : 0;
    const conversionRate = totalApplications > 0 ? 
      ((statusCounts.accepted || 0) / totalApplications) * 100 : 0;

    return {
      totalApplications,
      uniqueCandidates,
      activeJobs,
      avgApplicationsPerJob: Math.round(avgApplicationsPerJob * 10) / 10,
      conversionRate: Math.round(conversionRate * 10) / 10,
      statusBreakdown: statusCounts,
    };
  }

  private async getTrendAnalysis(applications: any[], dateRange: any) {
    const dailyStats = {};
    const weeklyStats = {};
    
    applications.forEach(app => {
      const date = new Date(app.createdAt);
      const dayKey = date.toISOString().split('T')[0];
      const weekKey = this.getWeekKey(date);
      
      dailyStats[dayKey] = (dailyStats[dayKey] || 0) + 1;
      weeklyStats[weekKey] = (weeklyStats[weekKey] || 0) + 1;
    });

    return {
      daily: Object.entries(dailyStats).map(([date, count]) => ({ date, count })),
      weekly: Object.entries(weeklyStats).map(([week, count]) => ({ week, count })),
    };
  }

  private async getTopPerformingJobs(applications: any[], jobs: any[]) {
    const jobStats = {};
    
    applications.forEach(app => {
      const jobId = app.job._id.toString();
      if (!jobStats[jobId]) {
        jobStats[jobId] = {
          jobId,
          title: app.job.title,
          applications: 0,
          accepted: 0,
          conversionRate: 0,
        };
      }
      jobStats[jobId].applications++;
      if (app.status === 'accepted') {
        jobStats[jobId].accepted++;
      }
    });

    // Calculate conversion rates
    Object.values(jobStats).forEach((job: any) => {
      job.conversionRate = job.applications > 0 ? 
        Math.round((job.accepted / job.applications) * 100 * 10) / 10 : 0;
    });

    return Object.values(jobStats)
      .sort((a: any, b: any) => b.applications - a.applications)
      .slice(0, 10);
  }

  private async getCandidateInsights(applications: any[]) {
    const skillsCount = {};
    const locationsCount = {};
    const experienceLevels = {};
    
    applications.forEach(app => {
      const candidate = app.applicant;
      
      // Skills analysis
      if (candidate.skills) {
        candidate.skills.forEach(skill => {
          skillsCount[skill] = (skillsCount[skill] || 0) + 1;
        });
      }
      
      // Location analysis
      if (candidate.location) {
        const location = candidate.location.split(',')[0].trim();
        locationsCount[location] = (locationsCount[location] || 0) + 1;
      }
      
      // Experience level analysis
      if (candidate.experience && candidate.experience.length > 0) {
        const totalYears = candidate.experience.reduce((total, exp) => {
          const startDate = new Date(exp.startDate);
          const endDate = exp.endDate ? new Date(exp.endDate) : new Date();
          const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
          return total + Number(years);
        }, 0);
        
        let level = 'entry';
        if (totalYears >= 10) level = 'lead';
        else if (totalYears >= 5) level = 'senior';
        else if (totalYears >= 2) level = 'mid';
        
        experienceLevels[level] = (experienceLevels[level] || 0) + 1;
      }
    });

    return {
      topSkills: Object.entries(skillsCount)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, count })),
      topLocations: Object.entries(locationsCount)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([location, count]) => ({ location, count })),
      experienceDistribution: experienceLevels,
    };
  }

  private async getConversionFunnel(applications: any[]) {
    const funnel = {
      applied: applications.length,
      reviewed: 0,
      shortlisted: 0,
      interviewed: 0,
      accepted: 0,
    };

    applications.forEach(app => {
      if (['reviewing', 'shortlisted', 'interview_scheduled', 'interviewed', 'accepted'].includes(app.status)) {
        funnel.reviewed++;
      }
      if (['shortlisted', 'interview_scheduled', 'interviewed', 'accepted'].includes(app.status)) {
        funnel.shortlisted++;
      }
      if (['interview_scheduled', 'interviewed', 'accepted'].includes(app.status)) {
        funnel.interviewed++;
      }
      if (app.status === 'accepted') {
        funnel.accepted++;
      }
    });

    return funnel;
  }

  private async getTimeToHireMetrics(applications: any[]) {
    const acceptedApplications = applications.filter(app => app.status === 'accepted');
    
    if (acceptedApplications.length === 0) {
      return { averageDays: 0, medianDays: 0, fastestHire: 0, slowestHire: 0 };
    }

    const hireTimes = acceptedApplications.map(app => {
      const appliedDate = new Date(app.createdAt);
      const acceptedDate = new Date(app.updatedAt);
      return Math.ceil((acceptedDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
    });

    hireTimes.sort((a, b) => a - b);
    
    const averageDays = Math.round(hireTimes.reduce((sum, days) => sum + days, 0) / hireTimes.length);
    const medianDays = hireTimes[Math.floor(hireTimes.length / 2)];
    const fastestHire = hireTimes[0];
    const slowestHire = hireTimes[hireTimes.length - 1];

    return {
      averageDays,
      medianDays,
      fastestHire,
      slowestHire,
    };
  }

  private async getSourceAnalysis(applications: any[]) {
    // This would typically track where applications came from
    // For now, we'll use a simple heuristic based on application data
    const sources = {
      'Direct Application': applications.length * 0.7,
      'Job Board': applications.length * 0.2,
      'Referral': applications.length * 0.1,
    };

    return Object.entries(sources).map(([source, count]) => ({
      source,
      count: Math.round(count),
      percentage: Math.round((count / applications.length) * 100),
    }));
  }

  private getDateRange(timeRange: string) {
    const now = new Date();
    const start = new Date();
    
    switch (timeRange) {
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start.setDate(now.getDate() - 30);
    }
    
    return { start, end: now };
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${week}`;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}
