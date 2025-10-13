import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MessagingPermission, MessagingPermissionDocument } from './schemas/messaging-permission.schema';

@Injectable()
export class MessagingPermissionsService {
  constructor(
    @InjectModel(MessagingPermission.name) 
    private messagingPermissionModel: Model<MessagingPermissionDocument>,
  ) {}

  async requestMessagingPermission(data: {
    user: string;
    targetUser: string;
    relatedJob?: string;
    relatedApplication?: string;
    message?: string;
    expiresInDays?: number;
  }): Promise<MessagingPermissionDocument> {
    const { user, targetUser, relatedJob, relatedApplication, message, expiresInDays = 7 } = data;

    // Check if permission already exists
    const existing = await this.messagingPermissionModel.findOne({
      user,
      targetUser,
    });

    if (existing) {
      if (existing.status === 'pending') {
        throw new ForbiddenException('Messaging permission request already pending');
      }
      if (existing.status === 'approved' && existing.isActive) {
        return existing; // Permission already exists and is active
      }
    }

    // Create new permission request
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const permission = await this.messagingPermissionModel.create({
      user,
      targetUser,
      relatedJob,
      relatedApplication,
      message,
      expiresAt,
      status: 'pending',
    });

    return permission;
  }

  async respondToPermissionRequest(
    permissionId: string,
    targetUserId: string,
    response: {
      status: 'approved' | 'rejected' | 'blocked';
      responseMessage?: string;
    },
  ): Promise<MessagingPermissionDocument> {
    const permission = await this.messagingPermissionModel.findById(permissionId);

    if (!permission) {
      throw new NotFoundException('Permission request not found');
    }

    if (permission.targetUser.toString() !== targetUserId) {
      throw new ForbiddenException('You can only respond to permission requests sent to you');
    }

    if (permission.status !== 'pending') {
      throw new ForbiddenException('Permission request has already been responded to');
    }

    permission.status = response.status;
    permission.responseMessage = response.responseMessage;
    permission.isActive = response.status === 'approved';
    permission.updatedAt = new Date();

    return permission.save();
  }

  async getUserPermissionRequests(userId: string): Promise<MessagingPermissionDocument[]> {
    return this.messagingPermissionModel
      .find({ user: userId })
      .populate('targetUser', 'fullName avatar email role')
      .populate('relatedJob', 'title company')
      .populate('relatedApplication', 'status')
      .sort({ createdAt: -1 });
  }

  async getReceivedPermissionRequests(userId: string): Promise<MessagingPermissionDocument[]> {
    return this.messagingPermissionModel
      .find({ targetUser: userId })
      .populate('user', 'fullName avatar email role')
      .populate('relatedJob', 'title company')
      .populate('relatedApplication', 'status')
      .sort({ createdAt: -1 });
  }

  async checkMessagingPermission(
    senderId: string,
    receiverId: string,
  ): Promise<{ canMessage: boolean; reason?: string; permission?: MessagingPermissionDocument }> {
    // Users can always message themselves (shouldn't happen in UI, but for safety)
    if (senderId === receiverId) {
      return { canMessage: true };
    }

    // Check if this is an admin conversation - users can always respond to admin messages
    try {
      const { User } = await import('../users/schemas/user.schema');
      const UserModel = this.messagingPermissionModel.db.model('User');
      
      const [sender, receiver] = await Promise.all([
        UserModel.findById(senderId),
        UserModel.findById(receiverId)
      ]);

      // If either user is admin, allow messaging (admin can message anyone, users can respond to admin)
      if (sender?.role === 'admin' || receiver?.role === 'admin') {
        console.log('Allowing admin messaging:', { senderRole: sender?.role, receiverRole: receiver?.role });
        return { canMessage: true };
      }
    } catch (error) {
      console.error('Error checking admin messaging permission:', error);
    }

    // TEMPORARY: Allow all messaging for testing
    console.log('TEMPORARY: Allowing all messaging for testing');
    return { canMessage: true };

    // Check if this is an employer-candidate relationship (employers can always message candidates who applied to their jobs)
    try {
      console.log('Checking employer-candidate relationship:', { senderId, receiverId });
      
      const { User } = await import('../users/schemas/user.schema');
      const UserModel = this.messagingPermissionModel.db.model('User');
      
      const [sender, receiver] = await Promise.all([
        UserModel.findById(senderId),
        UserModel.findById(receiverId)
      ]);

      console.log('Sender:', sender?.role, 'Receiver:', receiver?.role);

      if (sender && receiver) {
        // If sender is employer and receiver is job seeker
        if (sender.role === 'employer' && receiver.role === 'job_seeker') {
          console.log('Checking if job seeker has applied to employer jobs...');
          
          // Check if the job seeker has applied to any job posted by this employer
          const { Application } = await import('../applications/schemas/application.schema');
          const ApplicationModel = this.messagingPermissionModel.db.model('Application');
          
          const applications = await ApplicationModel.find({
            applicant: receiverId
          }).populate('job');
          
          console.log('Found applications:', applications.length);
          
          const hasAppliedToEmployerJob = applications.some(app => {
            const jobPostedBy = (app.job as any).postedBy?.toString();
            console.log('Application job posted by:', jobPostedBy, 'Sender ID:', senderId);
            return jobPostedBy === senderId;
          });
          
          console.log('Has applied to employer job:', hasAppliedToEmployerJob);
          
          if (hasAppliedToEmployerJob) {
            console.log('Allowing employer-candidate messaging');
            return { canMessage: true };
          }
        }
        
        // If sender is job seeker and receiver is employer
        if (sender.role === 'job_seeker' && receiver.role === 'employer') {
          console.log('Checking if job seeker has applied to employer jobs...');
          
          // Check if the job seeker has applied to any job posted by this employer
          const { Application } = await import('../applications/schemas/application.schema');
          const ApplicationModel = this.messagingPermissionModel.db.model('Application');
          
          const applications = await ApplicationModel.find({
            applicant: senderId
          }).populate('job');
          
          console.log('Found applications:', applications.length);
          
          const hasAppliedToEmployerJob = applications.some(app => {
            const jobPostedBy = (app.job as any).postedBy?.toString();
            console.log('Application job posted by:', jobPostedBy, 'Receiver ID:', receiverId);
            return jobPostedBy === receiverId;
          });
          
          console.log('Has applied to employer job:', hasAppliedToEmployerJob);
          
          if (hasAppliedToEmployerJob) {
            console.log('Allowing job seeker-employer messaging');
            return { canMessage: true };
          }
        }
      }
    } catch (error) {
      console.error('Error checking employer-candidate relationship:', error);
      // Continue with normal permission check if there's an error
    }

    const permission = await this.messagingPermissionModel.findOne({
      user: senderId,
      targetUser: receiverId,
    });

    if (!permission) {
      return {
        canMessage: false,
        reason: 'No messaging permission found. Request permission to start messaging.',
      };
    }

    if (permission.status === 'blocked') {
      return {
        canMessage: false,
        reason: 'Messaging has been blocked by this user.',
        permission,
      };
    }

    if (permission.status === 'rejected') {
      return {
        canMessage: false,
        reason: 'Messaging permission was rejected.',
        permission,
      };
    }

    if (permission.status === 'pending') {
      return {
        canMessage: false,
        reason: 'Messaging permission request is still pending approval.',
        permission,
      };
    }

    if (permission.status === 'approved' && !permission.isActive) {
      return {
        canMessage: false,
        reason: 'Messaging permission has expired.',
        permission,
      };
    }

    if (permission.expiresAt && permission.expiresAt < new Date()) {
      // Update permission status if expired
      permission.isActive = false;
      await permission.save();
      
      return {
        canMessage: false,
        reason: 'Messaging permission has expired.',
        permission,
      };
    }

    return { canMessage: true, permission };
  }

  async getActivePermissions(userId: string): Promise<MessagingPermissionDocument[]> {
    return this.messagingPermissionModel
      .find({
        $or: [
          { user: userId, status: 'approved', isActive: true },
          { targetUser: userId, status: 'approved', isActive: true },
        ],
      })
      .populate('user', 'fullName avatar email role')
      .populate('targetUser', 'fullName avatar email role')
      .populate('relatedJob', 'title company')
      .sort({ updatedAt: -1 });
  }

  async revokePermission(permissionId: string, userId: string): Promise<MessagingPermissionDocument> {
    const permission = await this.messagingPermissionModel.findById(permissionId);

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    // Only the user who requested permission or the target user can revoke it
    if (permission.user.toString() !== userId && permission.targetUser.toString() !== userId) {
      throw new ForbiddenException('You can only revoke your own permissions');
    }

    permission.isActive = false;
    permission.status = 'rejected';
    permission.updatedAt = new Date();

    return permission.save();
  }

  async blockUser(blockerId: string, blockedUserId: string): Promise<MessagingPermissionDocument> {
    // Find existing permission or create new one
    let permission = await this.messagingPermissionModel.findOne({
      user: blockerId,
      targetUser: blockedUserId,
    });

    if (!permission) {
      permission = await this.messagingPermissionModel.create({
        user: blockerId,
        targetUser: blockedUserId,
        status: 'blocked',
        isActive: false,
      });
    } else {
      permission.status = 'blocked';
      permission.isActive = false;
      permission.updatedAt = new Date();
      await permission.save();
    }

    // Also block in reverse direction
    let reversePermission = await this.messagingPermissionModel.findOne({
      user: blockedUserId,
      targetUser: blockerId,
    });

    if (!reversePermission) {
      reversePermission = await this.messagingPermissionModel.create({
        user: blockedUserId,
        targetUser: blockerId,
        status: 'blocked',
        isActive: false,
      });
    } else {
      reversePermission.status = 'blocked';
      reversePermission.isActive = false;
      reversePermission.updatedAt = new Date();
      await reversePermission.save();
    }

    return permission;
  }

  async unblockUser(unblockerId: string, unblockedUserId: string): Promise<void> {
    // Remove block status from both directions
    await this.messagingPermissionModel.updateMany(
      {
        $or: [
          { user: unblockerId, targetUser: unblockedUserId },
          { user: unblockedUserId, targetUser: unblockerId },
        ],
      },
      {
        status: 'pending',
        isActive: false,
        updatedAt: new Date(),
      },
    );
  }

  async cleanupExpiredPermissions(): Promise<{ modifiedCount: number }> {
    const result = await this.messagingPermissionModel.updateMany(
      {
        status: 'pending',
        expiresAt: { $lt: new Date() },
        isActive: { $ne: false },
      },
      {
        status: 'rejected',
        isActive: false,
        updatedAt: new Date(),
      },
    );

    return { modifiedCount: result.modifiedCount };
  }

  async getPermissionStats(userId: string): Promise<{
    pendingRequests: number;
    receivedRequests: number;
    activePermissions: number;
    blockedUsers: number;
  }> {
    const [pendingRequests, receivedRequests, activePermissions, blockedUsers] = await Promise.all([
      this.messagingPermissionModel.countDocuments({
        user: userId,
        status: 'pending',
      }),
      this.messagingPermissionModel.countDocuments({
        targetUser: userId,
        status: 'pending',
      }),
      this.messagingPermissionModel.countDocuments({
        $or: [
          { user: userId, status: 'approved', isActive: true },
          { targetUser: userId, status: 'approved', isActive: true },
        ],
      }),
      this.messagingPermissionModel.countDocuments({
        user: userId,
        status: 'blocked',
      }),
    ]);

    return {
      pendingRequests,
      receivedRequests,
      activePermissions,
      blockedUsers,
    };
  }
}
