import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from '../applications/schemas/application.schema';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { MailService } from '../mail/mail.service';
import { Subscription, SubscriptionDocument } from '../subscriptions/schemas/subscription.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { NotificationsService } from './notifications.service';

export interface NotificationContext {
  jobId?: string;
  applicationId?: string;
  userId?: string;
  companyId?: string;
  interviewId?: string;
  subscriptionId?: string;
}

@Injectable()
export class EnhancedNotificationsService {
  constructor(
    private readonly notificationsService: NotificationsService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    private readonly mailService: MailService,
  ) {}

  /**
   * 🔔 Job Application Notifications
   */
  async notifyNewJobApplication(applicationId: string): Promise<void> {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('job')
      .populate('applicant')
      .populate('company');

    if (!application) return;

    const job = application.job as any;
    const applicant = application.applicant as any;
    const company = application.company as any;

    // Notify the employer
    await this.notificationsService.createNotification({
      user: job.postedBy.toString(),
      title: '🎯 New Job Application',
      message: `${applicant.fullName} has applied for "${job.title}" at ${company.name}`,
      type: 'application',
      application: applicationId,
      job: job._id.toString(),
      actionUrl: `/employer/applications/${applicationId}`,
      metadata: {
        applicantName: applicant.fullName,
        jobTitle: job.title,
        companyName: company.name,
        appliedAt: new Date(),
      },
    });

    // Send email to employer
    try {
      const employer = await this.userModel.findById(job.postedBy);
      if (employer) {
        await this.mailService.sendNotificationEmail(
          employer.email,
          'New Job Application Received',
          `${applicant.fullName} has applied for your job "${job.title}". Review their application and take action.`,
          `${process.env.FRONTEND_URL}/employer/applications/${applicationId}`
        );
      }
    } catch (error) {
      console.error('Error sending email notification to employer:', error);
    }
  }

  async notifyApplicationStatusChange(applicationId: string, newStatus: string): Promise<void> {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('job')
      .populate('applicant');

    if (!application) return;

    const job = application.job as any;
    const applicant = application.applicant as any;

    const statusMessages = {
      'pending': 'Your application is under review',
      'reviewing': 'Your application is being reviewed',
      'shortlisted': 'Congratulations! You have been shortlisted',
      'interview_scheduled': 'Interview has been scheduled',
      'interviewed': 'Your interview has been completed',
      'accepted': '🎉 Congratulations! Your application has been accepted',
      'rejected': 'Your application was not selected this time',
      'withdrawn': 'Your application has been withdrawn',
    };

    const message = statusMessages[newStatus] || `Your application status has been updated to ${newStatus}`;

    await this.notificationsService.createNotification({
      user: applicant._id.toString(),
      title: `📋 Application Update - ${job.title}`,
      message: message,
      type: 'application',
      application: applicationId,
      job: job._id.toString(),
      actionUrl: `/applications`,
      metadata: {
        status: newStatus,
        jobTitle: job.title,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 🎤 Interview Notifications
   */
  async notifyInterviewScheduled(
    applicationId: string,
    interviewDate: Date,
    interviewType: string = 'Online',
    meetingLink?: string,
  ): Promise<void> {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('job')
      .populate('applicant');

    if (!application) return;

    const job = application.job as any;
    const applicant = application.applicant as any;

    // Notify applicant
    await this.notificationsService.createNotification({
      user: applicant._id.toString(),
      title: '🎤 Interview Scheduled',
      message: `Your interview for "${job.title}" is scheduled for ${interviewDate.toLocaleDateString()} at ${interviewDate.toLocaleTimeString()}`,
      type: 'interview',
      application: applicationId,
      job: job._id.toString(),
      actionUrl: `/applications`,
      metadata: {
        interviewDate,
        interviewType,
        meetingLink,
        jobTitle: job.title,
      },
    });

    // Notify employer (optional)
    const jobData = job as any;
    await this.notificationsService.createNotification({
      user: jobData.postedBy.toString(),
      title: '📅 Interview Scheduled',
      message: `Interview scheduled with ${applicant.fullName} for "${job.title}"`,
      type: 'interview',
      application: applicationId,
      job: job._id.toString(),
      actionUrl: `/employer/applications/${applicationId}`,
      metadata: {
        applicantName: applicant.fullName,
        interviewDate,
        interviewType,
        jobTitle: job.title,
      },
    });
  }

  /**
   * 💼 Job-Related Notifications
   */
  async notifyNewJobPosted(jobId: string): Promise<void> {
    const job = await this.jobModel
      .findById(jobId)
      .populate('company')
      .populate('postedBy');

    if (!job) return;

    const company = job.company as any;
    const poster = job.postedBy as any;

    // Find users who might be interested in this job
    const interestedUsers = await this.userModel.find({
      $or: [
        { skills: { $in: job.skills || [] } },
        { location: { $regex: job.location, $options: 'i' } },
        { 'notificationPreferences.newJobMatches': true },
      ],
      _id: { $ne: poster._id }, // Don't notify the job poster
    }).limit(50); // Limit to prevent spam

    // Create bulk notifications
    const notifications = interestedUsers.map(user => ({
      user: user._id.toString(),
      title: '💼 New Job Match',
      message: `A new job "${job.title}" at ${company.name} matches your profile`,
      type: 'job_match',
      job: jobId,
      actionUrl: `/jobs/${jobId}`,
      metadata: {
        jobTitle: job.title,
        companyName: company.name,
        location: job.location,
        skills: job.skills,
      },
    }));

    if (notifications.length > 0) {
      await this.notificationsService.createBulkNotifications(notifications);
    }

    // Notify job poster about successful posting
    await this.notificationsService.createNotification({
      user: poster._id.toString(),
      title: '✅ Job Posted Successfully',
      message: `Your job "${job.title}" has been posted and is now live`,
      type: 'system',
      job: jobId,
      actionUrl: `/employer/jobs/${jobId}`,
      metadata: {
        jobTitle: job.title,
        companyName: company.name,
        postedAt: new Date(),
      },
    });
  }

  async notifyJobExpiringSoon(jobId: string, daysLeft: number): Promise<void> {
    const job = await this.jobModel
      .findById(jobId)
      .populate('postedBy');

    if (!job) return;

    const poster = job.postedBy as any;

    await this.notificationsService.createNotification({
      user: poster._id.toString(),
      title: '⏰ Job Expiring Soon',
      message: `Your job "${job.title}" expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Consider extending it to get more applications.`,
      type: 'reminder',
      job: jobId,
      actionUrl: `/employer/jobs/${jobId}`,
      metadata: {
        jobTitle: job.title,
        daysLeft,
        expiresAt: job.applicationDeadline,
      },
    });
  }

  /**
   * 💳 Subscription Notifications
   */
  async notifySubscriptionExpiringSoon(userId: string, daysLeft: number): Promise<void> {
    const subscription = await this.subscriptionModel.findOne({ user: userId });
    if (!subscription) return;

    await this.notificationsService.createNotification({
      user: userId,
      title: '💳 Subscription Expiring Soon',
      message: `Your ${subscription.plan} subscription expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Renew to continue posting jobs.`,
      type: 'subscription',
      actionUrl: `/pricing`,
      metadata: {
        plan: subscription.plan,
        daysLeft,
        expiresAt: subscription.currentPeriodEnd,
      },
    });
  }

  async notifySubscriptionExpired(userId: string): Promise<void> {
    const subscription = await this.subscriptionModel.findOne({ user: userId });
    if (!subscription) return;

    await this.notificationsService.createNotification({
      user: userId,
      title: '⚠️ Subscription Expired',
      message: `Your ${subscription.plan} subscription has expired. Upgrade to continue posting jobs.`,
      type: 'subscription',
      actionUrl: `/pricing`,
      metadata: {
        plan: subscription.plan,
        expiredAt: new Date(),
      },
    });
  }

  /**
   * 💬 Message Notifications
   */
  async notifyNewMessage(
    recipientId: string,
    senderId: string,
    conversationId: string,
    messagePreview: string,
  ): Promise<void> {
    const sender = await this.userModel.findById(senderId);
    if (!sender) return;

    await this.notificationsService.createNotification({
      user: recipientId,
      title: `💬 New message from ${sender.fullName}`,
      message: messagePreview.length > 100 ? messagePreview.substring(0, 100) + '...' : messagePreview,
      type: 'message',
      conversation: conversationId,
      actionUrl: `/messages?conversation=${conversationId}`,
      metadata: {
        senderName: sender.fullName,
        senderId,
        messageLength: messagePreview.length,
      },
    });
  }

  /**
   * 👑 Admin Notifications
   */
  async notifyAdminAction(
    targetUserId: string,
    action: string,
    details: string,
    adminUserId: string,
  ): Promise<void> {
    await this.notificationsService.createNotification({
      user: targetUserId,
      title: '👑 Admin Action',
      message: `${action}: ${details}`,
      type: 'admin',
      actionUrl: `/profile`,
      metadata: {
        action,
        details,
        adminUserId,
        performedAt: new Date(),
      },
    });
  }

  /**
   * 🔔 System Notifications
   */
  async notifySystemMaintenance(
    message: string,
    scheduledTime?: Date,
    affectedFeatures?: string[],
  ): Promise<void> {
    // Get all active users
    const users = await this.userModel.find({
      'notificationPreferences.systemNotifications': true,
    }).limit(1000); // Limit to prevent overwhelming the system

    const notifications = users.map(user => ({
      user: user._id.toString(),
      title: '🔧 System Maintenance',
      message: message,
      type: 'system',
      actionUrl: '/',
      metadata: {
        scheduledTime,
        affectedFeatures,
        notifiedAt: new Date(),
      },
    }));

    if (notifications.length > 0) {
      await this.notificationsService.createBulkNotifications(notifications);
    }
  }

  /**
   * 📊 Weekly Digest Notifications
   */
  async sendWeeklyDigest(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user?.notificationPreferences?.weeklyDigest) return;

    // Get user's activity for the week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [applications, jobs] = await Promise.all([
      this.applicationModel.countDocuments({
        applicant: userId,
        createdAt: { $gte: weekAgo },
      }),
      this.jobModel.countDocuments({
        postedBy: userId,
        createdAt: { $gte: weekAgo },
      }),
    ]);

    const message = `This week: ${applications} application${applications === 1 ? '' : 's'} submitted, ${jobs} job${jobs === 1 ? '' : 's'} posted. Keep up the great work!`;

    await this.notificationsService.createNotification({
      user: userId,
      title: '📊 Weekly Activity Summary',
      message: message,
      type: 'digest',
      actionUrl: '/dashboard',
      metadata: {
        applicationsThisWeek: applications,
        jobsPostedThisWeek: jobs,
        weekStart: weekAgo,
        weekEnd: new Date(),
      },
    });
  }

  /**
   * 🎯 Smart Job Recommendations
   */
  async notifyJobRecommendations(userId: string, jobIds: string[]): Promise<void> {
    if (jobIds.length === 0) return;

    const jobs = await this.jobModel
      .find({ _id: { $in: jobIds } })
      .populate('company')
      .limit(3); // Limit to top 3 recommendations

    if (jobs.length === 0) return;

    const jobTitles = jobs.map(job => `"${job.title}"`).join(', ');
    const message = `We found ${jobs.length} new job${jobs.length === 1 ? '' : 's'} that match your profile: ${jobTitles}`;

    await this.notificationsService.createNotification({
      user: userId,
      title: '🎯 Job Recommendations',
      message: message,
      type: 'recommendation',
      actionUrl: '/jobs?recommended=true',
      metadata: {
        recommendedJobs: jobIds,
        jobCount: jobs.length,
        recommendedAt: new Date(),
      },
    });
  }
}
