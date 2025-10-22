import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { Subscription, SubscriptionDocument } from './schemas/subscription.schema';

export interface JobBoost {
  jobId: string;
  boostedAt: Date;
  expiresAt: Date;
  boostType: 'featured' | 'top_search' | 'highlight';
  isActive: boolean;
}

@Injectable()
export class JobBoostService {
  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    private notificationsService: NotificationsService,
  ) {}

  async boostJob(userId: string, jobId: string, boostDays: number = 7): Promise<any> {
    // Check if job exists and belongs to user
    const job = await this.jobModel.findOne({ _id: jobId, postedBy: userId });
    if (!job) {
      throw new NotFoundException('Job not found or you do not have permission');
    }

    // Check user's subscription and boosts
    const subscription = await this.subscriptionModel.findOne({ user: userId });
    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    if (subscription.boostsAvailable <= subscription.boostsUsed) {
      throw new BadRequestException('No boosts available. Please upgrade your plan.');
    }

    // Apply boost to job
    job.isFeatured = true;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + boostDays);
    job.expiresAt = expiresAt;

    await job.save();

    // Increment boost usage
    subscription.boostsUsed += 1;
    await subscription.save();

    // Send notification
    await this.notificationsService.createNotification({
      user: userId,
      title: 'Job Boosted Successfully',
      message: `Your job "${job.title}" is now featured and will appear at the top of search results for ${boostDays} days`,
      type: 'success',
      actionUrl: `/employer/jobs/${jobId}`,
    });

    return {
      job,
      boostExpiresAt: expiresAt,
      boostsRemaining: subscription.boostsAvailable - subscription.boostsUsed,
    };
  }

  async removeBoost(userId: string, jobId: string): Promise<any> {
    const job = await this.jobModel.findOne({ _id: jobId, postedBy: userId });
    if (!job) {
      throw new NotFoundException('Job not found or you do not have permission');
    }

    job.isFeatured = false;
    job.expiresAt = undefined;
    await job.save();

    // Send notification about boost removal
    await this.notificationsService.createNotification({
      user: userId,
      title: 'Job Boost Removed',
      message: `The boost for job "${job.title}" has been removed. It will no longer appear as featured.`,
      type: 'info',
      actionUrl: `/employer/jobs/${jobId}`,
    });

    return { job };
  }

  /**
   * Check for expired job boosts and send notifications
   */
  async checkExpiredBoosts(): Promise<void> {
    const now = new Date();
    
    // Find jobs with expired boosts
    const expiredBoostedJobs = await this.jobModel.find({
      isFeatured: true,
      expiresAt: { $lte: now },
    }).populate('postedBy');

    for (const job of expiredBoostedJobs) {
      // Remove the boost
      job.isFeatured = false;
      job.expiresAt = undefined;
      await job.save();

      // Send notification to job owner
      const jobOwner = job.postedBy as any;
      await this.notificationsService.createNotification({
        user: jobOwner._id.toString(),
        title: '⏰ Job Boost Expired',
        message: `The boost for your job "${job.title}" has expired. It will no longer appear as featured. Consider boosting it again to get more visibility.`,
        type: 'reminder',
        actionUrl: `/employer/jobs/${job._id}`,
        metadata: {
          jobId: job._id.toString(),
          jobTitle: job.title,
          expiredAt: now,
        },
      });
    }

    if (expiredBoostedJobs.length > 0) {
      console.log(`📊 Processed ${expiredBoostedJobs.length} expired job boosts`);
    }
  }

  async getBoostedJobs(userId: string): Promise<JobDocument[]> {
    return this.jobModel
      .find({
        postedBy: userId,
        isFeatured: true,
        expiresAt: { $gte: new Date() },
      })
      .populate('company', 'name')
      .sort({ expiresAt: 1 })
      .exec();
  }

  async getBoostStats(userId: string): Promise<any> {
    const subscription = await this.subscriptionModel.findOne({ user: userId });
    if (!subscription) {
      return {
        boostsAvailable: 0,
        boostsUsed: 0,
        boostsRemaining: 0,
      };
    }

    const boostedJobs = await this.getBoostedJobs(userId);

    return {
      boostsAvailable: subscription.boostsAvailable,
      boostsUsed: subscription.boostsUsed,
      boostsRemaining: subscription.boostsAvailable - subscription.boostsUsed,
      activeBoostedJobs: boostedJobs.length,
      boostedJobs: boostedJobs.map(job => ({
        jobId: job._id,
        title: job.title,
        expiresAt: job.expiresAt,
      })),
    };
  }
}
