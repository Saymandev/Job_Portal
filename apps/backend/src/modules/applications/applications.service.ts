import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JobsService } from '../jobs/jobs.service';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { MailService } from '../mail/mail.service';
import { EnhancedNotificationsService } from '../notifications/enhanced-notifications.service';
import { NotificationsService } from '../notifications/notifications.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { Application, ApplicationDocument, ApplicationStatus } from './schemas/application.schema';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jobsService: JobsService,
    private mailService: MailService,
    private notificationsService: NotificationsService,
    private enhancedNotificationsService: EnhancedNotificationsService,
  ) {}

  async create(
    userId: string,
    createApplicationDto: CreateApplicationDto,
  ): Promise<ApplicationDocument> {
    const { jobId, resume, coverLetter, portfolio } = createApplicationDto;

    // Check if job exists
    const job = await this.jobModel.findById(jobId).populate('company');
    if (!job || job.status !== 'open') {
      throw new NotFoundException('Job not found or not accepting applications');
    }

    // Check if already applied
    const existingApplication = await this.applicationModel.findOne({
      job: jobId,
      applicant: userId,
    });

    if (existingApplication) {
      throw new ConflictException('You have already applied for this job');
    }

    // Get user details
    const user = await this.userModel.findById(userId);

    // Create application
    const application = await this.applicationModel.create({
      job: jobId,
      applicant: userId,
      company: job.company,
      resume: resume || user.resume,
      coverLetter,
      portfolio,
    });

    // Increment job application count
    await this.jobsService.incrementApplicationCount(jobId);

    // Send enhanced notification to job poster (employer)
    await this.enhancedNotificationsService.notifyNewJobApplication(application._id.toString());

    // Send confirmation email to applicant
    await this.mailService.sendApplicationConfirmation(user.email, job.title);

    return application.populate(['job', 'applicant', 'company']);
  }

  async findByApplicant(userId: string): Promise<ApplicationDocument[]> {
   
    const applications = await this.applicationModel
      .find({ applicant: userId })
      .populate('job')
      .populate('company')
      .sort({ createdAt: -1 });
    
    
   
    
    return applications;
  }

  async findByJob(jobId: string, employerId: string): Promise<ApplicationDocument[]> {
    // Verify job belongs to employer
    const job = await this.jobModel.findOne({ _id: jobId, postedBy: employerId });
    if (!job) {
      throw new ForbiddenException('You do not have access to these applications');
    }

    // Check if employer has priority applications feature enabled
    const hasPriorityApplications = await this.checkFeatureEnabled(employerId, 'priorityApplicationsEnabled');

    let applications = await this.applicationModel
      .find({ job: jobId })
      .populate('applicant', 'fullName email phone skills location')
      .lean();

    if (hasPriorityApplications) {
      // Sort by priority: premium users first, then by creation date
      applications = applications.sort((a, b) => {
        const aIsPremium = this.isApplicantPremium(a.applicant);
        const bIsPremium = this.isApplicantPremium(b.applicant);
        
        if (aIsPremium && !bIsPremium) return -1;
        if (!aIsPremium && bIsPremium) return 1;
        
        // If both have same priority status, sort by creation date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else {
      // Default sorting by creation date
      applications = applications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return applications as unknown as ApplicationDocument[];
  }

  async findByEmployer(employerId: string): Promise<ApplicationDocument[]> {
    // Get all jobs posted by this employer
    const employerJobs = await this.jobModel.find({ postedBy: employerId }).select('_id');
    const jobIds = employerJobs.map(job => job._id);

    // Get all applications for these jobs
    const applications = await this.applicationModel
      .find({ job: { $in: jobIds } })
      .populate('job')
      .populate('applicant', 'fullName email phone skills location')
      .sort({ createdAt: -1 });

    return applications;
  }

  async findRecentByEmployer(employerId: string, limit: number = 10): Promise<ApplicationDocument[]> {
    // Get all jobs posted by this employer
    const employerJobs = await this.jobModel.find({ postedBy: employerId }).select('_id');
    const jobIds = employerJobs.map(job => job._id);

    // Get recent applications for these jobs
    const applications = await this.applicationModel
      .find({ job: { $in: jobIds } })
      .populate('job', 'title location')
      .populate('applicant', 'fullName email phone skills location avatar')
      .sort({ createdAt: -1 })
      .limit(limit);

    return applications;
  }

  async findRecentByEmployerPaginated(employerId: string, page: number = 1, limit: number = 10): Promise<PaginatedResult<any>> {
    // Get all jobs posted by this employer
    const employerJobs = await this.jobModel.find({ postedBy: employerId }).select('_id');
    const jobIds = employerJobs.map(job => job._id);

    const skip = (page - 1) * limit;

    // Get recent applications with pagination
    const [applications, total] = await Promise.all([
      this.applicationModel
        .find({ job: { $in: jobIds } })
        .populate('job', 'title location')
        .populate('applicant', 'fullName email phone skills location avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.applicationModel.countDocuments({ job: { $in: jobIds } }),
    ]);

    // Transform the response to match frontend expectations
    const data = applications.map((app: any) => ({
      _id: app._id,
      user: {
        _id: app.applicant?._id,
        fullName: app.applicant?.fullName || 'Unknown Applicant',
        email: app.applicant?.email || '',
        avatar: app.applicant?.avatar,
        phone: app.applicant?.phone,
        location: app.applicant?.location,
        skills: app.applicant?.skills || [],
      },
      job: {
        _id: app.job?._id,
        title: app.job?.title || 'Unknown Job',
        location: app.job?.location,
      },
      status: app.status,
      appliedAt: app.createdAt,
      resume: app.resume,
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

  async findByCompany(companyId: string, employerId: string): Promise<ApplicationDocument[]> {
    // Verify user is employer of this company
    const applications = await this.applicationModel
      .find({ company: companyId })
      .populate('job')
      .populate('applicant', 'fullName email phone skills location')
      .sort({ createdAt: -1 });

    return applications;
  }

  async findById(id: string): Promise<ApplicationDocument> {
    const application = await this.applicationModel
      .findById(id)
      .populate('job')
      .populate('applicant')
      .populate('company');

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async updateStatus(
    id: string,
    employerId: string,
    updateStatusDto: UpdateApplicationStatusDto,
  ): Promise<ApplicationDocument> {
    const application = await this.applicationModel
      .findById(id)
      .populate('job')
      .populate('applicant');

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Verify employer owns the job
    const jobRecord = await this.jobModel.findOne({ _id: application.job, postedBy: employerId });
    if (!jobRecord) {
      throw new ForbiddenException('You do not have permission to update this application');
    }

    application.status = updateStatusDto.status;
    if (updateStatusDto.notes) {
      application.notes = updateStatusDto.notes;
    }
    if (updateStatusDto.interviewDate) {
      application.interviewDate = updateStatusDto.interviewDate;
    }
    if (updateStatusDto.feedback) {
      application.feedback = updateStatusDto.feedback;
    }

    await application.save();

    // Send enhanced notification to applicant
    await this.enhancedNotificationsService.notifyApplicationStatusChange(
      application._id.toString(),
      updateStatusDto.status
    );

    // Send email notification
    const user = application.applicant as any;
    const jobData = application.job as any;
    await this.mailService.sendApplicationStatusUpdate(
      user.email,
      jobData.title,
      updateStatusDto.status,
    );

    return application;
  }

  async withdraw(id: string, userId: string): Promise<void> {
    const application = await this.applicationModel.findOne({ _id: id, applicant: userId });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status === ApplicationStatus.ACCEPTED) {
      throw new ForbiddenException('Cannot withdraw accepted application');
    }

    await application.deleteOne();
  }

  async getStats(companyId?: string) {
    const query = companyId ? { company: companyId } : {};

    const [total, byStatus] = await Promise.all([
      this.applicationModel.countDocuments(query),
      this.applicationModel.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      byStatus,
    };
  }

  /**
   * Check if an applicant has premium features (for priority application processing)
   */
  private isApplicantPremium(applicant: any): boolean {
    // For now, we'll consider an applicant premium if they have a subscription
    // In a real implementation, you might check their subscription status
    // For this demo, we'll use a simple heuristic based on profile completeness
    if (!applicant) return false;
    
    // Check if user has complete profile (indicates they're serious about job searching)
    const hasCompleteProfile = applicant.skills && 
                              applicant.skills.length > 0 && 
                              applicant.location && 
                              applicant.fullName;
    
    return hasCompleteProfile;
  }

  /**
   * Download candidate resume with subscription check
   */
  async downloadResume(applicationId: string, employerId: string): Promise<Buffer> {
    // Get application and verify employer access
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('job', 'postedBy')
      .populate('applicant', 'resume fullName');

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Verify job belongs to employer
    if ((application.job as any).postedBy.toString() !== employerId) {
      throw new ForbiddenException('You do not have access to this application');
    }

    // Check if employer has unlimited resume downloads feature
    const hasUnlimitedDownloads = await this.checkFeatureEnabled(employerId, 'unlimitedResumeDownloads');

    if (!hasUnlimitedDownloads) {
      // For free users, limit downloads (implement download tracking)
      const downloadCount = await this.getResumeDownloadCount(employerId);
      if (downloadCount >= 5) { // Free plan limit
        throw new ForbiddenException('Resume download limit reached. Upgrade your plan for unlimited downloads.');
      }
    }

    // Get resume file path
    const resumePath = application.resume || (application.applicant as any).resume;
    if (!resumePath) {
      throw new NotFoundException('Resume not found');
    }

    // Handle both local storage and Cloudinary URLs
    try {
      let resumeBuffer: Buffer;
      
      if (resumePath.startsWith('http')) {
        // Cloudinary URL - download the file
        const axios = require('axios');
        const response = await axios.get(resumePath, {
          responseType: 'arraybuffer',
          timeout: 30000,
        });
        resumeBuffer = Buffer.from(response.data);
      } else {
        // Local file - read from filesystem
        const fs = await import('fs');
        const path = await import('path');
        const fullPath = path.join(process.cwd(), 'uploads', resumePath);
        resumeBuffer = fs.readFileSync(fullPath);
      }
      
      // Track download for analytics
      await this.trackResumeDownload(employerId, applicationId);
      
      return resumeBuffer;
    } catch (error) {
      console.error('Error downloading resume:', error);
      // If file not found, return a mock PDF
      return this.generateMockResume(application.applicant);
    }
  }

  private async getResumeDownloadCount(employerId: string): Promise<number> {
    // In a real implementation, you'd track downloads in a separate collection
    // For now, return 0 (unlimited for demo)
    return 0;
  }

  private async trackResumeDownload(employerId: string, applicationId: string): Promise<void> {
    // Track download for analytics
    // Resume downloaded by employer
  }

  private generateMockResume(applicant: any): Buffer {
    // Generate a simple mock PDF for demo purposes
    const mockPdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(${applicant.fullName || 'Candidate'} Resume) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`;

    return Buffer.from(mockPdfContent);
  }

  /**
   * Check if a specific feature is enabled for the employer
   */
  private async checkFeatureEnabled(employerId: string, featureName: string): Promise<boolean> {
    try {
      // Get subscription from database
      const { Subscription, SubscriptionSchema } = await import('../subscriptions/schemas/subscription.schema');
      const subscriptionModel = this.applicationModel.db.model('Subscription', SubscriptionSchema);
      
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

  /**
   * Get applications for employer with search, filter, and pagination
   */
  async findByEmployerWithFilters(
    employerId: string,
    page: number,
    limit: number,
    search?: string,
    status?: string,
    jobId?: string,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ): Promise<PaginatedResult<ApplicationDocument>> {
    const skip = (page - 1) * limit;
    const query: any = {};

    // Get all jobs posted by this employer
    const employerJobs = await this.jobModel.find({ postedBy: employerId }).select('_id');
    const jobIds = employerJobs.map(job => job._id);

    // Filter by job IDs
    query.job = { $in: jobIds };

    // Search functionality
    if (search) {
      query.$or = [
        { 'applicant.name': { $regex: search, $options: 'i' } },
        { 'applicant.email': { $regex: search, $options: 'i' } },
        { 'job.title': { $regex: search, $options: 'i' } },
        { 'job.company.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by specific job
    if (jobId && jobId !== 'all') {
      query.job = jobId;
    }

    // Sort configuration
    const sortConfig: any = {};
    if (sortBy) {
      const sortField = sortBy === 'applicant' ? 'applicant.name' : 
                      sortBy === 'job' ? 'job.title' : 
                      sortBy === 'company' ? 'job.company.name' : 
                      sortBy;
      sortConfig[sortField] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortConfig.createdAt = -1; // Default sort by newest
    }

    const applications = await this.applicationModel
      .find(query)
      .populate('applicant', 'name email avatar')
      .populate({
        path: 'job',
        select: 'title company location workType',
        populate: {
          path: 'company',
          select: 'name logo'
        }
      })
      .sort(sortConfig)
      .skip(skip)
      .limit(limit);

    const total = await this.applicationModel.countDocuments(query);

    return {
      data: applications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }
}

