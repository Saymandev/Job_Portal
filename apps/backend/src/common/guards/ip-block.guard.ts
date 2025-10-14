import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlockedIp, BlockedIpDocument } from '../schemas/blocked-ip.schema';

@Injectable()
export class IpBlockGuard implements CanActivate {
  constructor(
    @InjectModel(BlockedIp.name) private blockedIpModel: Model<BlockedIpDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ipAddress = this.getClientIp(request);

    if (!ipAddress) {
      return true; // Allow if we can't determine IP
    }

    // Check if IP is blocked
    const blockedIp = await this.blockedIpModel.findOne({
      ipAddress,
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } }, // Permanent block
        { expiresAt: { $gt: new Date() } }, // Not expired yet
      ],
    });

    if (blockedIp) {
      // Log the blocked attempt
      console.warn(`Blocked IP ${ipAddress} attempted access. Reason: ${blockedIp.reason}`);
      
      // Update violation count and last seen
      await this.blockedIpModel.updateOne(
        { _id: blockedIp._id },
        {
          $inc: { violationCount: 1 },
          $set: { 'metadata.lastSeen': new Date() },
        },
      );

      throw new HttpException(
        {
          message: 'Access denied',
          reason: 'IP address blocked',
          details: blockedIp.reason,
          expiresAt: blockedIp.expiresAt,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }

  private getClientIp(request: any): string | null {
    // Check various headers for the real IP address
    const forwarded = request.headers['x-forwarded-for'];
    const realIp = request.headers['x-real-ip'];
    const cfConnectingIp = request.headers['cf-connecting-ip']; // Cloudflare
    
    if (cfConnectingIp) return cfConnectingIp;
    if (realIp) return realIp;
    if (forwarded) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return forwarded.split(',')[0].trim();
    }
    
    return request.ip || request.connection?.remoteAddress || null;
  }
}
