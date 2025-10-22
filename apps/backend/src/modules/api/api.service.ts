import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AnalyticsService } from '../analytics/analytics.service';
import { ApplicationAnalyticsService } from '../analytics/application-analytics.service';
import { ApplicationsService } from '../applications/applications.service';
import { CompaniesService } from '../companies/companies.service';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class ApiService {
  constructor(
    private readonly jobsService: JobsService,
    private readonly applicationsService: ApplicationsService,
    private readonly companiesService: CompaniesService,
    private readonly analyticsService: AnalyticsService,
    private readonly applicationAnalyticsService: ApplicationAnalyticsService,
  ) {}

  async getJobs(userId: string, query: any) {
    // Add user filter to ensure users only see their own jobs
    const jobs = await this.jobsService.findAll({
      ...query,
      employer: userId,
    });

    return {
      success: true,
      data: jobs,
    };
  }

  async createJob(userId: string, jobData: any) {
    const result = await this.jobsService.create(userId, jobData);

    return {
      success: true,
      message: 'Job created successfully',
      data: result.job,
    };
  }

  async getJob(userId: string, jobId: string) {
    const job = await this.jobsService.findById(jobId);
    
    if (!job || job.postedBy.toString() !== userId) {
      throw new UnauthorizedException('Job not found or access denied');
    }

    return {
      success: true,
      data: job,
    };
  }

  async updateJob(userId: string, jobId: string, jobData: any) {
    const job = await this.jobsService.findById(jobId);
    
    if (!job || job.postedBy.toString() !== userId) {
      throw new UnauthorizedException('Job not found or access denied');
    }

    const updatedJob = await this.jobsService.update(jobId, userId, jobData);

    return {
      success: true,
      message: 'Job updated successfully',
      data: updatedJob,
    };
  }

  async deleteJob(userId: string, jobId: string) {
    const job = await this.jobsService.findById(jobId);
    
    if (!job || job.postedBy.toString() !== userId) {
      throw new UnauthorizedException('Job not found or access denied');
    }

    await this.jobsService.delete(jobId, userId);

    return {
      success: true,
      message: 'Job deleted successfully',
    };
  }

  async getApplications(userId: string, query: any) {
    const applications = await this.applicationsService.findByEmployer(userId);

    return {
      success: true,
      data: applications,
    };
  }

  async getApplication(userId: string, applicationId: string) {
    const application = await this.applicationsService.findById(applicationId);
    
    if (!application || (application.job as any).postedBy.toString() !== userId) {
      throw new UnauthorizedException('Application not found or access denied');
    }

    return {
      success: true,
      data: application,
    };
  }

  async updateApplicationStatus(userId: string, applicationId: string, statusData: any) {
    const application = await this.applicationsService.findById(applicationId);
    
    if (!application || (application.job as any).postedBy.toString() !== userId) {
      throw new UnauthorizedException('Application not found or access denied');
    }

    const updatedApplication = await this.applicationsService.updateStatus(
      applicationId,
      userId,
      statusData
    );

    return {
      success: true,
      message: 'Application status updated successfully',
      data: updatedApplication,
    };
  }

  async getCompany(userId: string) {
    const company = await this.companiesService.findByOwner(userId);

    return {
      success: true,
      data: company,
    };
  }

  async updateCompany(userId: string, companyData: any) {
    const existingCompany = await this.companiesService.findByOwner(userId);
    if (!existingCompany) {
      throw new UnauthorizedException('Company not found');
    }
    
    const company = await this.companiesService.update(existingCompany._id.toString(), userId, companyData);

    return {
      success: true,
      message: 'Company updated successfully',
      data: company,
    };
  }

  async getJobAnalytics(userId: string, query: any) {
    const analytics = await this.analyticsService.getEmployerAnalytics(userId);

    return {
      success: true,
      data: analytics,
    };
  }

  async getApplicationAnalytics(userId: string, query: any) {
    const analytics = await this.applicationAnalyticsService.getApplicationAnalytics(userId, query.timeRange || '30d');

    return {
      success: true,
      data: analytics,
    };
  }
}
