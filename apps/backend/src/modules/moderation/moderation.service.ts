import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContentFlag, ContentFlagDocument, FlagPriority, FlagStatus } from './schemas/content-flag.schema';

@Injectable()
export class ModerationService {
  constructor(
    @InjectModel(ContentFlag.name) private contentFlagModel: Model<ContentFlagDocument>,
  ) {}

  async createFlag(flagData: Partial<ContentFlag>): Promise<ContentFlagDocument> {
    const flag = new this.contentFlagModel(flagData);
    return flag.save();
  }

  async getFlags(
    limit: number,
    page: number,
    search?: string,
    status?: string,
    priority?: string,
    type?: string
  ) {
    const skip = (page - 1) * limit;
    const query: any = {};

    // Search functionality
    if (search) {
      query.$or = [
        { reason: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { targetTitle: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by priority
    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    // Filter by type
    if (type && type !== 'all') {
      query.type = type;
    }

    const flags = await this.contentFlagModel
      .find(query)
      .populate('reporter', 'name email')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.contentFlagModel.countDocuments(query);

    return {
      flags,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFlagById(id: string): Promise<ContentFlagDocument> {
    return this.contentFlagModel
      .findById(id)
      .populate('reporter', 'name email')
      .populate('reviewedBy', 'name email');
  }

  async updateFlagStatus(
    id: string,
    status: FlagStatus,
    reviewedBy: string,
    resolution?: string
  ): Promise<ContentFlagDocument> {
    return this.contentFlagModel.findByIdAndUpdate(
      id,
      {
        status,
        reviewedBy,
        reviewedAt: new Date(),
        resolution,
      },
      { new: true }
    );
  }

  async escalateFlag(
    id: string,
    escalatedTo: string,
    reason: string
  ): Promise<ContentFlagDocument> {
    return this.contentFlagModel.findByIdAndUpdate(
      id,
      {
        status: FlagStatus.ESCALATED,
        escalatedTo,
        escalatedAt: new Date(),
        escalatedReason: reason,
      },
      { new: true }
    );
  }

  async getFlagStats() {
    const [
      totalFlags,
      pendingFlags,
      resolvedFlags,
      escalatedFlags,
      highPriorityFlags,
      flagsThisMonth
    ] = await Promise.all([
      this.contentFlagModel.countDocuments(),
      this.contentFlagModel.countDocuments({ status: FlagStatus.PENDING }),
      this.contentFlagModel.countDocuments({ status: FlagStatus.RESOLVED }),
      this.contentFlagModel.countDocuments({ status: FlagStatus.ESCALATED }),
      this.contentFlagModel.countDocuments({ priority: FlagPriority.HIGH }),
      this.contentFlagModel.countDocuments({
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      })
    ]);

    return {
      totalFlags,
      pendingFlags,
      resolvedFlags,
      escalatedFlags,
      highPriorityFlags,
      flagsThisMonth,
      resolutionRate: totalFlags > 0 ? Math.round((resolvedFlags / totalFlags) * 100) : 0
    };
  }
}
