import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity, ActivityDocument, ActivityType } from './schemas/activity.schema';

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
  ) {}

  async logActivity(
    type: ActivityType,
    description: string,
    userId: string,
    metadata?: {
      targetUserId?: string;
      jobId?: string;
      applicationId?: string;
      companyId?: string;
      ipAddress?: string;
      userAgent?: string;
      [key: string]: any;
    },
  ) {
    const activity = new this.activityModel({
      type,
      description,
      userId,
      targetUserId: metadata?.targetUserId,
      jobId: metadata?.jobId,
      applicationId: metadata?.applicationId,
      companyId: metadata?.companyId,
      metadata: metadata || {},
      ipAddress: metadata?.ipAddress || '127.0.0.1',
      userAgent: metadata?.userAgent || 'Unknown',
    });

    return activity.save();
  }

  async getRecentActivity(limit: number = 10) {
    return this.activityModel
      .find()
      .populate('userId', 'fullName email role')
      .populate('targetUserId', 'fullName email')
      .populate('jobId', 'title')
      .populate('applicationId', 'status')
      .populate('companyId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async getActivityByType(type: ActivityType, limit: number = 10) {
    return this.activityModel
      .find({ type })
      .populate('userId', 'fullName email role')
      .populate('targetUserId', 'fullName email')
      .populate('jobId', 'title')
      .populate('applicationId', 'status')
      .populate('companyId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async getActivityByUser(userId: string, limit: number = 10) {
    return this.activityModel
      .find({ userId })
      .populate('userId', 'fullName email role')
      .populate('targetUserId', 'fullName email')
      .populate('jobId', 'title')
      .populate('applicationId', 'status')
      .populate('companyId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}
