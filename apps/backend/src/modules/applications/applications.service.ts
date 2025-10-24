import { PaginatedResult } from '@/common/interfaces/paginated-result.interface';
import {
  BadRequestException,
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
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
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
    private subscriptionsService: SubscriptionsService,
  ) {}

  async create(
    userId: string,
    createApplicationDto: CreateApplicationDto,
  ): Promise<ApplicationDocument> {
    const { jobId, resume, coverLetter, portfolio } = createApplicationDto;

    try {
      // Validate input
      if (!jobId) {
        throw new BadRequestException('Job ID is required');
      }

      // Check if job exists
      const job = await this.jobModel.findById(jobId).populate('company');
      if (!job) {
        throw new NotFoundException('Job not found');
      }

      if (job.status !== 'open') {
        throw new ConflictException('This job is no longer accepting applications');
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
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Validate resume
      const resumeToUse = resume || user.resume;
      if (!resumeToUse) {
        throw new BadRequestException('Resume is required to apply for this job');
      }

      // Create application
      const application = await this.applicationModel.create({
        job: jobId,
        applicant: userId,
        company: job.company,
        resume: resumeToUse,
        coverLetter,
        portfolio,
        status: 'pending', // Default status
      });

      // Increment job application count
      await this.jobsService.incrementApplicationCount(jobId);

      // Send enhanced notification to job poster (employer)
      try {
        await this.enhancedNotificationsService.notifyNewJobApplication(application._id.toString());
      } catch (error) {
        console.error('Error sending notification:', error);
        // Don't fail the application if notification fails
      }

      // Send confirmation email to applicant
      try {
        await this.mailService.sendApplicationConfirmation(user.email, job.title);
      } catch (error) {
        console.error('Error sending confirmation email:', error);
        // Don't fail the application if email fails
      }

      return application.populate(['job', 'applicant', 'company']);
    } catch (error) {
      console.error('Error creating application:', error);
      throw error;
    }
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
      // We need to check premium status for each applicant
      const applicationsWithPremium = await Promise.all(
        applications.map(async (app) => ({
          ...app,
          isPremium: await this.isApplicantPremium(app.applicant)
        }))
      );
      
      applications = applicationsWithPremium.sort((a, b) => {
        if (a.isPremium && !b.isPremium) return -1;
        if (!a.isPremium && b.isPremium) return 1;
        
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
  private async isApplicantPremium(applicant: any): Promise<boolean> {
    if (!applicant || !applicant._id) return false;
    
    try {
      // Check if user has an active premium subscription
      const subscription = await this.subscriptionsService.getUserSubscription(applicant._id.toString());
      
      if (!subscription) {
        // Job seekers don't have subscriptions, but we can check for premium features
        // based on profile completeness and activity
        return this.checkJobSeekerPremiumFeatures(applicant);
      }
      
      // Check if subscription is active and has premium features
      const isActive = subscription.status === 'active';
      const hasPremiumPlan = ['pro', 'enterprise'].includes(subscription.plan);
      const hasFeaturedProfile = subscription.featuredProfileEnabled;
      
      return isActive && (hasPremiumPlan || hasFeaturedProfile);
    } catch (error) {
      console.error('Error checking premium status:', error);
      // Fallback to profile-based check
      return this.checkJobSeekerPremiumFeatures(applicant);
    }
  }

  /**
   * Check premium features for job seekers (who don't have subscriptions)
   */
  private checkJobSeekerPremiumFeatures(applicant: any): boolean {
    if (!applicant) return false;
    
    // Premium job seekers have:
    // 1. Complete profile with all essential fields
    const hasCompleteProfile = applicant.skills && 
                              applicant.skills.length >= 5 && 
                              applicant.location && 
                              applicant.fullName &&
                              applicant.professionalTitle &&
                              (applicant.cvExperience && applicant.cvExperience.length > 0);
    
    // 2. High profile completion percentage (90%+)
    const profileCompletion = this.calculateProfileCompletion(applicant);
    const hasHighCompletion = profileCompletion >= 90;
    
    // 3. Recent activity (applied to jobs in last 30 days)
    const hasRecentActivity = applicant.lastLogin && 
                             (new Date().getTime() - new Date(applicant.lastLogin).getTime()) < (30 * 24 * 60 * 60 * 1000);
    
    // 4. Professional indicators
    const hasProfessionalIndicators = applicant.linkedinUrl || 
                                     applicant.githubUrl || 
                                     applicant.portfolioUrl ||
                                     (applicant.certifications && applicant.certifications.length > 0);
    
    return hasCompleteProfile && hasHighCompletion && (hasRecentActivity || hasProfessionalIndicators);
  }

  /**
   * Calculate profile completion percentage for job seekers
   */
  private calculateProfileCompletion(applicant: any): number {
    if (!applicant) return 0;
    
    const fields = [
      'fullName',
      'email', 
      'phone',
      'location',
      'professionalTitle',
      'bio',
      'skills',
      'cvExperience',
      'cvEducation',
      'resume',
      'linkedinUrl',
      'githubUrl',
      'portfolioUrl'
    ];
    
    let completedFields = 0;
    
    fields.forEach(field => {
      const value = applicant[field];
      if (value) {
        if (Array.isArray(value)) {
          if (value.length > 0) completedFields++;
        } else if (typeof value === 'string') {
          if (value.trim().length > 0) completedFields++;
        } else {
          completedFields++;
        }
      }
    });
    
    return Math.round((completedFields / fields.length) * 100);
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
    try {
      // Create a simple download tracking collection
      const downloadCollection = this.applicationModel.db.collection('resume_downloads');
      const count = await downloadCollection.countDocuments({ employerId });
      return count;
    } catch (error) {
      console.error('Error getting download count:', error);
      return 0; // Default to 0 on error
    }
  }

  private async trackResumeDownload(employerId: string, applicationId: string): Promise<void> {
    try {
      // Track download for analytics
      const downloadCollection = this.applicationModel.db.collection('resume_downloads');
      await downloadCollection.insertOne({
        employerId,
        applicationId,
        downloadedAt: new Date(),
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error tracking download:', error);
      // Don't throw error as this is not critical
    }
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
      // Get subscription from database using direct collection access
      const subscriptionCollection = this.applicationModel.db.collection('subscriptions');
      const subscription = await subscriptionCollection.findOne({ user: employerId });
      
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
   * Get download analytics for an employer
   */
  async getDownloadAnalytics(employerId: string): Promise<any> {
    try {
      const downloadCollection = this.applicationModel.db.collection('resume_downloads');
      
      const [totalDownloads, recentDownloads, downloadsByMonth] = await Promise.all([
        downloadCollection.countDocuments({ employerId }),
        downloadCollection.find({ employerId })
          .sort({ downloadedAt: -1 })
          .limit(10)
          .toArray(),
        downloadCollection.aggregate([
          { $match: { employerId } },
          {
            $group: {
              _id: {
                year: { $year: '$downloadedAt' },
                month: { $month: '$downloadedAt' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': -1, '_id.month': -1 } }
        ]).toArray()
      ]);

      return {
        totalDownloads,
        recentDownloads,
        downloadsByMonth,
        remainingDownloads: Math.max(0, 5 - totalDownloads) // Free plan limit
      };
    } catch (error) {
      console.error('Error getting download analytics:', error);
      return {
        totalDownloads: 0,
        recentDownloads: [],
        downloadsByMonth: [],
        remainingDownloads: 5
      };
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

    // Search functionality - need to use aggregation for populated fields
    let searchPipeline: any[] = [];
    if (search) {
      searchPipeline = [
        {
          $lookup: {
            from: 'users',
            localField: 'applicant',
            foreignField: '_id',
            as: 'applicantData'
          }
        },
        {
          $lookup: {
            from: 'jobs',
            localField: 'job',
            foreignField: '_id',
            as: 'jobData'
          }
        },
        {
          $lookup: {
            from: 'companies',
            localField: 'jobData.company',
            foreignField: '_id',
            as: 'companyData'
          }
        },
        {
          $match: {
            $or: [
              { 'applicantData.fullName': { $regex: search, $options: 'i' } },
              { 'applicantData.email': { $regex: search, $options: 'i' } },
              { 'jobData.title': { $regex: search, $options: 'i' } },
              { 'companyData.name': { $regex: search, $options: 'i' } }
            ]
          }
        }
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

    let applications: any[];
    let total: number;

    if (search) {
      // Use aggregation for search functionality
      const pipeline = [
        { $match: query },
        ...searchPipeline,
        {
          $lookup: {
            from: 'users',
            localField: 'applicant',
            foreignField: '_id',
            as: 'applicant'
          }
        },
        {
          $lookup: {
            from: 'jobs',
            localField: 'job',
            foreignField: '_id',
            as: 'job'
          }
        },
        {
          $lookup: {
            from: 'companies',
            localField: 'job.company',
            foreignField: '_id',
            as: 'company'
          }
        },
        {
          $addFields: {
            applicant: { $arrayElemAt: ['$applicant', 0] },
            job: { $arrayElemAt: ['$job', 0] },
            company: { $arrayElemAt: ['$company', 0] }
          }
        },
        { $sort: sortConfig },
        { $skip: skip },
        { $limit: limit }
      ];

      const [results, countResults] = await Promise.all([
        this.applicationModel.aggregate(pipeline),
        this.applicationModel.aggregate([
          { $match: query },
          ...searchPipeline,
          { $count: 'total' }
        ])
      ]);

      applications = results;
      total = countResults[0]?.total || 0;
    } else {
      // Use regular find for non-search queries
      applications = await this.applicationModel
        .find(query)
        .populate('applicant', 'fullName email avatar phone skills location')
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

      total = await this.applicationModel.countDocuments(query);
    }

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

