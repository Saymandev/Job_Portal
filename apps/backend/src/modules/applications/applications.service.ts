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

    return this.applicationModel
      .find({ job: jobId })
      .populate('applicant', 'fullName email phone skills location')
      .sort({ createdAt: -1 });
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
}

