import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import { Model } from 'mongoose';
import { AuditAction, AuditLog, AuditLogDocument, AuditResource } from '../schemas/audit-log.schema';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(
    userId: string,
    action: AuditAction,
    resource: AuditResource,
    resourceId: string,
    details: Record<string, any> = {},
    req?: Request,
    success: boolean = true,
    errorMessage?: string,
  ): Promise<void> {
    try {
      const ipAddress = req?.ip || req?.connection?.remoteAddress || 'unknown';
      const userAgent = req?.get('User-Agent') || 'unknown';

      await this.auditLogModel.create({
        userId,
        action,
        resource,
        resourceId,
        details,
        ipAddress,
        userAgent,
        success,
        errorMessage,
        timestamp: new Date(),
      });
    } catch (error) {
      // Don't throw error for audit logging failures to avoid breaking main functionality
      console.error('Audit logging failed:', error);
    }
  }

  async getAuditLogs(
    userId?: string,
    action?: AuditAction,
    resource?: AuditResource,
    limit: number = 100,
    skip: number = 0,
  ) {
    const query: any = {};
    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (resource) query.resource = resource;

    return this.auditLogModel
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .populate('userId', 'email fullName');
  }

  async getSuspiciousActivity(
    timeWindowHours: number = 24,
    thresholdCount: number = 10,
  ) {
    const timeWindow = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

    // Find users with high activity in time window
    const suspiciousUsers = await this.auditLogModel.aggregate([
      {
        $match: {
          timestamp: { $gte: timeWindow },
          success: false, // Focus on failed attempts
        },
      },
      {
        $group: {
          _id: '$userId',
          failedAttempts: { $sum: 1 },
          lastActivity: { $max: '$timestamp' },
          actions: { $addToSet: '$action' },
        },
      },
      {
        $match: {
          failedAttempts: { $gte: thresholdCount },
        },
      },
    ]);

    return suspiciousUsers;
  }
}
