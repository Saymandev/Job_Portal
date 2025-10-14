import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlockedIp, BlockedIpDocument, BlockReason, BlockType } from '../schemas/blocked-ip.schema';

export interface BlockIpDto {
  ipAddress: string;
  blockType: BlockType;
  reason: BlockReason;
  description?: string;
  blockedBy: string;
  expiresAt?: Date;
  metadata?: any;
}

export interface UnblockIpDto {
  ipAddress: string;
  unblockedBy: string;
  reason: string;
}

@Injectable()
export class IpBlockService {
  constructor(
    @InjectModel(BlockedIp.name) private blockedIpModel: Model<BlockedIpDocument>,
  ) {}

  async blockIp(blockData: BlockIpDto): Promise<BlockedIp> {
    try {
      // Check if IP is already blocked
      const existingBlock = await this.blockedIpModel.findOne({
        ipAddress: blockData.ipAddress,
        isActive: true,
      });

      if (existingBlock) {
        throw new HttpException(
          `IP ${blockData.ipAddress} is already blocked`,
          HttpStatus.CONFLICT,
        );
      }

      const blockedIp = new this.blockedIpModel({
        ...blockData,
        isActive: true,
        violationCount: 0,
        metadata: {
          firstSeen: new Date(),
          lastSeen: new Date(),
          ...blockData.metadata,
        },
      });

      return await blockedIp.save();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to block IP address',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async unblockIp(unblockData: UnblockIpDto): Promise<BlockedIp> {
    try {
      const blockedIp = await this.blockedIpModel.findOne({
        ipAddress: unblockData.ipAddress,
        isActive: true,
      });

      if (!blockedIp) {
        throw new HttpException(
          `IP ${unblockData.ipAddress} is not currently blocked`,
          HttpStatus.NOT_FOUND,
        );
      }

      blockedIp.isActive = false;
      blockedIp.unblockedAt = new Date();
      blockedIp.unblockedBy = unblockData.unblockedBy;
      blockedIp.unblockReason = unblockData.reason;

      return await blockedIp.save();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to unblock IP address',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getBlockedIps(
    page: number = 1,
    limit: number = 20,
    isActive?: boolean,
    blockType?: BlockType,
    reason?: BlockReason,
  ): Promise<{ data: BlockedIp[]; total: number; page: number; limit: number }> {
    try {
      const skip = (page - 1) * limit;
      const filter: any = {};

      if (isActive !== undefined) {
        filter.isActive = isActive;
      }
      if (blockType) {
        filter.blockType = blockType;
      }
      if (reason) {
        filter.reason = reason;
      }

      const [data, total] = await Promise.all([
        this.blockedIpModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        this.blockedIpModel.countDocuments(filter),
      ]);

      return {
        data,
        total,
        page,
        limit,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve blocked IPs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getBlockedIp(ipAddress: string): Promise<BlockedIp | null> {
    try {
      return await this.blockedIpModel.findOne({
        ipAddress,
        isActive: true,
      });
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve blocked IP information',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async isIpBlocked(ipAddress: string): Promise<boolean> {
    try {
      const blockedIp = await this.blockedIpModel.findOne({
        ipAddress,
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } }, // Permanent block
          { expiresAt: { $gt: new Date() } }, // Not expired yet
        ],
      });

      return !!blockedIp;
    } catch (error) {
      console.error('Error checking IP block status:', error);
      return false; // Allow access if we can't check
    }
  }

  async updateViolationCount(ipAddress: string): Promise<void> {
    try {
      await this.blockedIpModel.updateOne(
        { ipAddress, isActive: true },
        {
          $inc: { violationCount: 1 },
          $set: { 'metadata.lastSeen': new Date() },
        },
      );
    } catch (error) {
      console.error('Error updating violation count:', error);
    }
  }

  async autoBlockIp(
    ipAddress: string,
    reason: BlockReason,
    metadata?: any,
    expiresAt?: Date,
  ): Promise<BlockedIp> {
    try {
      return await this.blockIp({
        ipAddress,
        blockType: BlockType.AUTOMATIC,
        reason,
        blockedBy: 'system',
        expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
        metadata,
      });
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.CONFLICT) {
        // IP is already blocked, just update violation count
        await this.updateViolationCount(ipAddress);
        return await this.getBlockedIp(ipAddress);
      }
      throw error;
    }
  }

  async cleanupExpiredBlocks(): Promise<number> {
    try {
      const result = await this.blockedIpModel.updateMany(
        {
          isActive: true,
          expiresAt: { $lte: new Date() },
        },
        {
          isActive: false,
          unblockedAt: new Date(),
          unblockedBy: 'system',
          unblockReason: 'Automatic expiration',
        },
      );

      return result.modifiedCount;
    } catch (error) {
      console.error('Error cleaning up expired blocks:', error);
      return 0;
    }
  }

  async getBlockStatistics(): Promise<{
    totalBlocks: number;
    activeBlocks: number;
    expiredBlocks: number;
    blocksByReason: Record<string, number>;
    blocksByType: Record<string, number>;
    recentBlocks: number;
  }> {
    try {
      const [
        totalBlocks,
        activeBlocks,
        expiredBlocks,
        blocksByReason,
        blocksByType,
        recentBlocks,
      ] = await Promise.all([
        this.blockedIpModel.countDocuments(),
        this.blockedIpModel.countDocuments({ isActive: true }),
        this.blockedIpModel.countDocuments({ isActive: false }),
        this.blockedIpModel.aggregate([
          { $group: { _id: '$reason', count: { $sum: 1 } } },
        ]),
        this.blockedIpModel.aggregate([
          { $group: { _id: '$blockType', count: { $sum: 1 } } },
        ]),
        this.blockedIpModel.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }),
      ]);

      return {
        totalBlocks,
        activeBlocks,
        expiredBlocks,
        blocksByReason: blocksByReason.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        blocksByType: blocksByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recentBlocks,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve block statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
