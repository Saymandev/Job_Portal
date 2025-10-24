import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { MessagingPermission, MessagingPermissionDocument } from './schemas/messaging-permission.schema';

@Injectable()
export class MessagingPermissionsService {
  constructor(
    @InjectModel(MessagingPermission.name) 
    private messagingPermissionModel: Model<MessagingPermissionDocument>,
    private subscriptionsService: SubscriptionsService,
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

  async autoCreateEmployerCandidatePermission(senderId: string, receiverId: string): Promise<void> {
    try {
      console.log('🔧 [AUTO-PERMISSION] Creating employer-candidate permission:', { senderId, receiverId });
      
      // First, check if the sender has a valid subscription for auto-messaging
      const subscription = await this.subscriptionsService.getUserSubscription(senderId);
      console.log('🔍 [AUTO-PERMISSION] Checking subscription:', { 
        hasSubscription: !!subscription, 
        plan: subscription?.plan,
        directMessagingEnabled: subscription?.directMessagingEnabled,
        status: subscription?.status
      });
      
      // Only allow auto-creation for Pro and Enterprise plans with active subscriptions
      if (!subscription || 
          !['pro', 'enterprise'].includes(subscription.plan) || 
          subscription.status !== 'active' || 
          !subscription.directMessagingEnabled) {
        console.log('❌ [AUTO-PERMISSION] User does not have valid subscription for auto-messaging');
        return;
      }
      
      // Check if permission already exists
      const existingPermission = await this.messagingPermissionModel.findOne({
        $or: [
          { user: senderId.toString(), targetUser: receiverId.toString() },
          { user: receiverId.toString(), targetUser: senderId.toString() }
        ]
      });

      if (!existingPermission) {
        console.log('🔧 [AUTO-PERMISSION] No existing permission found, creating new ones');
        
        // Create bidirectional permissions for employer-candidate relationship
        const permissions = await this.messagingPermissionModel.create([
          {
            user: senderId.toString(),
            targetUser: receiverId.toString(),
            status: 'approved',
            type: 'employer_candidate',
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            user: receiverId.toString(),
            targetUser: senderId.toString(),
            status: 'approved',
            type: 'employer_candidate',
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ]);
        
        console.log('✅ [AUTO-PERMISSION] Created permissions:', permissions.map(p => ({ 
          user: p.user, 
          targetUser: p.targetUser, 
          status: p.status 
        })));
      } else {
        console.log('ℹ️ [AUTO-PERMISSION] Permission already exists:', existingPermission._id);
      }
    } catch (error) {
      console.error('❌ [AUTO-PERMISSION] Error auto-creating employer-candidate permission:', error);
      // Don't throw error, just log it
    }
  }

  async checkMessagingPermission(
    senderId: string,
    receiverId: string,
  ): Promise<{ canMessage: boolean; reason?: string; permission?: MessagingPermissionDocument }> {
    console.log('🚨🚨🚨 [PERMISSION CHECK] METHOD CALLED 🚨🚨🚨');
    console.log('🔍 [PERMISSION CHECK] Starting permission check:', { 
      senderId: senderId.toString(), 
      receiverId: receiverId.toString(),
      timestamp: new Date().toISOString()
    });
    
    // Users can always message themselves (shouldn't happen in UI, but for safety)
    if (senderId.toString() === receiverId.toString()) {
      console.log('✅ [PERMISSION CHECK] Same user, allowing');
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
        
        return { canMessage: true };
      }
    } catch (error) {
      // Error checking admin messaging permission
    }

    // Check if this is an employer-candidate relationship (employers can always message candidates who applied to their jobs)
    try {
      const { User } = await import('../users/schemas/user.schema');
      const UserModel = this.messagingPermissionModel.db.model('User');
      
      const [sender, receiver] = await Promise.all([
        UserModel.findById(senderId),
        UserModel.findById(receiverId)
      ]);

      if (sender && receiver) {
        // If sender is employer and receiver is job seeker
        if (sender.role === 'employer' && receiver.role === 'job_seeker') {
          console.log('🔍 [PERMISSION CHECK] Employer-candidate relationship detected');
          
          // Check if the job seeker has applied to any job posted by this employer
          const { Application } = await import('../applications/schemas/application.schema');
          const ApplicationModel = this.messagingPermissionModel.db.model('Application');
          
          const applications = await ApplicationModel.find({
            applicant: receiverId
          }).populate('job');
          
          console.log('🔍 [PERMISSION CHECK] Found applications:', applications.length);
          
          const hasAppliedToEmployerJob = applications.some(app => {
            const jobPostedBy = (app.job as any).postedBy?.toString();
            return jobPostedBy === senderId;
          });
          
          if (hasAppliedToEmployerJob) {
            console.log('✅ [PERMISSION CHECK] Candidate has applied to employer job, auto-creating permission');
            // Auto-create messaging permission for employer-candidate relationship
            await this.autoCreateEmployerCandidatePermission(senderId, receiverId);
            return { canMessage: true };
          }

          // If no application found, check if employer has premium subscription for enhanced matching
          const subscription = await this.subscriptionsService.getUserSubscription(senderId);
          console.log('🔍 [PERMISSION CHECK] Subscription check:', { 
            hasSubscription: !!subscription, 
            directMessagingEnabled: subscription?.directMessagingEnabled,
            plan: subscription?.plan 
          });
          
          if (subscription && 
              subscription.directMessagingEnabled && 
              ['pro', 'enterprise'].includes(subscription.plan) &&
              subscription.status === 'active') {
            console.log('✅ [PERMISSION CHECK] Premium employer, auto-creating permission');
            // Auto-create messaging permission for premium employer contacting any candidate
            await this.autoCreateEmployerCandidatePermission(senderId, receiverId);
            return { canMessage: true };
          } else {
            console.log('❌ [PERMISSION CHECK] Employer does not have valid subscription for auto-messaging');
          }
        }
        
        // If sender is job seeker and receiver is employer
        if (sender.role === 'job_seeker' && receiver.role === 'employer') {
          // Check if the job seeker has applied to any job posted by this employer
          const { Application } = await import('../applications/schemas/application.schema');
          const ApplicationModel = this.messagingPermissionModel.db.model('Application');
          
          const applications = await ApplicationModel.find({
            applicant: senderId
          }).populate('job');
          
          const hasAppliedToEmployerJob = applications.some(app => {
            const jobPostedBy = (app.job as any).postedBy?.toString();
            return jobPostedBy === receiverId;
          });
          
          if (hasAppliedToEmployerJob) {
            // Check if the employer has a valid subscription for auto-messaging
            const employerSubscription = await this.subscriptionsService.getUserSubscription(receiverId);
            console.log('🔍 [PERMISSION CHECK] Employer subscription check:', { 
              hasSubscription: !!employerSubscription, 
              directMessagingEnabled: employerSubscription?.directMessagingEnabled,
              plan: employerSubscription?.plan 
            });
            
            if (employerSubscription && 
                employerSubscription.directMessagingEnabled && 
                ['pro', 'enterprise'].includes(employerSubscription.plan) &&
                employerSubscription.status === 'active') {
              console.log('✅ [PERMISSION CHECK] Employer has valid subscription, auto-creating permission');
              // Auto-create messaging permission for employer-candidate relationship
              await this.autoCreateEmployerCandidatePermission(senderId, receiverId);
              return { canMessage: true };
            } else {
              console.log('❌ [PERMISSION CHECK] Employer does not have valid subscription for auto-messaging');
            }
          }
        }
      }
    } catch (error) {
      console.log('❌ [PERMISSION CHECK] Error in employer-candidate relationship check:', error.message);
      // Error checking employer-candidate relationship, continue with normal permission check
    }

    console.log('🔍 [PERMISSION CHECK] Looking up direct permission in database...');
    const permission = await this.messagingPermissionModel.findOne({
      user: senderId.toString(),
      targetUser: receiverId.toString(),
    });

    console.log('🔍 [PERMISSION CHECK] Direct permission lookup:', { 
      found: !!permission, 
      permissionId: permission?._id,
      status: permission?.status,
      isActive: permission?.isActive,
      expiresAt: permission?.expiresAt,
      type: (permission as any)?.type
    });

    if (!permission) {
      console.log('❌ [PERMISSION CHECK] No permission found, denying access');
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

    // Check if permission has expired first, before checking isActive
    if (permission.expiresAt && permission.expiresAt < new Date()) {
      console.log('🔍 [PERMISSION CHECK] Permission expired, checking renewal eligibility:', {
        expiresAt: permission.expiresAt,
        currentTime: new Date(),
        permissionType: (permission as any).type,
        senderId,
        receiverId
      });
      
      // Try to renew permission if it's between an employer and job seeker
      try {
        // Determine which user is the employer
        const { User } = await import('../users/schemas/user.schema');
        const UserModel = this.messagingPermissionModel.db.model('User');
        const [sender, receiver] = await Promise.all([
          UserModel.findById(senderId),
          UserModel.findById(receiverId)
        ]);

        let employerId = null;
        let isEmployerCandidateRelationship = false;
        
        if (sender && receiver) {
          if (sender.role === 'employer' && receiver.role === 'job_seeker') {
            employerId = senderId;
            isEmployerCandidateRelationship = true;
          } else if (receiver.role === 'employer' && sender.role === 'job_seeker') {
            employerId = receiverId;
            isEmployerCandidateRelationship = true;
          }
        }

        console.log('🔍 [PERMISSION RENEWAL] Checking relationship:', {
          senderRole: sender?.role,
          receiverRole: receiver?.role,
          isEmployerCandidateRelationship,
          employerId
        });

        if (isEmployerCandidateRelationship && employerId) {
          const subscription = await this.subscriptionsService.getUserSubscription(employerId);
          
          console.log('🔍 [PERMISSION RENEWAL] Checking employer subscription:', { 
            employerId, 
            hasSubscription: !!subscription, 
            plan: subscription?.plan,
            status: subscription?.status 
          });
          
          if (subscription && 
              subscription.status === 'active' && 
              ['pro', 'enterprise'].includes(subscription.plan) && 
              subscription.directMessagingEnabled) {
            
            console.log('🔄 [PERMISSION CHECK] Renewing expired permission for premium employer');
            
            // Renew the permission for another 90 days
            permission.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
            permission.isActive = true;
            await permission.save();
            
            console.log('✅ [PERMISSION CHECK] Permission renewed successfully');
            return { canMessage: true, permission };
          } else {
            console.log('❌ [PERMISSION RENEWAL] Employer does not have valid subscription for renewal');
          }
        } else {
          console.log('❌ [PERMISSION RENEWAL] Not an employer-candidate relationship or could not determine employer ID');
        }
      } catch (error) {
        console.error('Error checking subscription for permission renewal:', error);
      }
      
      // Update permission status if expired and not renewable
      permission.isActive = false;
      await permission.save();
      
      console.log('❌ [PERMISSION CHECK] Permission expired and not renewable, denying access');
      return {
        canMessage: false,
        reason: 'Messaging permission has expired.',
        permission,
      };
    }

    // Check if permission is active (after handling expiration/renewal)
    if (permission.status === 'approved' && !permission.isActive) {
      console.log('❌ [PERMISSION CHECK] Permission is not active:', {
        status: permission.status,
        isActive: permission.isActive
      });
      return {
        canMessage: false,
        reason: 'Messaging permission has expired.',
        permission,
      };
    }

    console.log('✅ [PERMISSION CHECK] Permission check passed, allowing message');
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

  // Check if user has messaging permissions based on subscription
  async hasMessagingPermissions(userId: string): Promise<{ hasPermissions: boolean; reason?: string; plan?: string }> {
    try {
      const subscription = await this.subscriptionsService.getUserSubscription(userId);
      
      if (!subscription) {
        return { 
          hasPermissions: false, 
          reason: 'No subscription found. Upgrade to Pro or Enterprise for direct messaging.' 
        };
      }
      
      if (subscription.status !== 'active') {
        return { 
          hasPermissions: false, 
          reason: 'Subscription is not active. Please renew your subscription.' 
        };
      }
      
      if (!['pro', 'enterprise'].includes(subscription.plan)) {
        return { 
          hasPermissions: false, 
          reason: 'Direct messaging requires Pro or Enterprise plan. Upgrade to unlock this feature.',
          plan: subscription.plan
        };
      }
      
      if (!subscription.directMessagingEnabled) {
        return { 
          hasPermissions: false, 
          reason: 'Direct messaging is not enabled for your account. Contact support.' 
        };
      }
      
      return { 
        hasPermissions: true, 
        plan: subscription.plan 
      };
    } catch (error) {
      console.error('Error checking messaging permissions:', error);
      return { 
        hasPermissions: false, 
        reason: 'Error checking subscription status' 
      };
    }
  }

  // Renew all expired permissions for a premium user
  async renewExpiredPermissions(userId: string): Promise<{ renewed: number; message: string }> {
    try {
      // Check if the user is an employer with premium subscription
      const { User } = await import('../users/schemas/user.schema');
      const UserModel = this.messagingPermissionModel.db.model('User');
      const user = await UserModel.findById(userId);
      
      if (!user || user.role !== 'employer') {
        return { 
          renewed: 0, 
          message: 'Only employers can renew messaging permissions' 
        };
      }

      const subscription = await this.subscriptionsService.getUserSubscription(userId);
      
      if (!subscription || 
          subscription.status !== 'active' || 
          !['pro', 'enterprise'].includes(subscription.plan) || 
          !subscription.directMessagingEnabled) {
        return { 
          renewed: 0, 
          message: 'User does not have valid subscription for permission renewal' 
        };
      }

      // Find all expired employer-candidate permissions for this employer
      const expiredPermissions = await this.messagingPermissionModel.find({
        $or: [
          { user: userId, type: 'employer_candidate', expiresAt: { $lt: new Date() } },
          { targetUser: userId, type: 'employer_candidate', expiresAt: { $lt: new Date() } }
        ]
      });

      if (expiredPermissions.length === 0) {
        return { 
          renewed: 0, 
          message: 'No expired permissions found' 
        };
      }

      // Renew all expired permissions
      const renewalDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
      
      await this.messagingPermissionModel.updateMany(
        { _id: { $in: expiredPermissions.map(p => p._id) } },
        { 
          expiresAt: renewalDate,
          isActive: true,
          updatedAt: new Date()
        }
      );

      console.log(`✅ [PERMISSION RENEWAL] Renewed ${expiredPermissions.length} expired permissions for employer ${userId}`);

      return { 
        renewed: expiredPermissions.length, 
        message: `Successfully renewed ${expiredPermissions.length} expired permissions` 
      };
    } catch (error) {
      console.error('Error renewing expired permissions:', error);
      return { 
        renewed: 0, 
        message: 'Error renewing permissions' 
      };
    }
  }
}
