import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from '../applications/schemas/application.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

export interface DirectMessage {
  _id?: string;
  from: string; // employer ID
  to: string;   // candidate ID
  applicationId: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class DirectMessagingService {
  private messages: DirectMessage[] = []; // In-memory storage for demo

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
  ) {}

  /**
   * Send a direct message from employer to candidate
   */
  async sendMessage(
    employerId: string,
    candidateId: string,
    applicationId: string,
    subject: string,
    message: string,
  ): Promise<DirectMessage> {
    // Verify the application exists and belongs to the employer
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('job', 'postedBy')
      .populate('applicant');

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Verify job belongs to employer
    if ((application.job as any).postedBy.toString() !== employerId) {
      throw new ForbiddenException('You do not have access to this application');
    }

    // Verify candidate matches the application
    if ((application.applicant as any)._id.toString() !== candidateId) {
      throw new ForbiddenException('Invalid candidate for this application');
    }

    // Check if employer has direct messaging feature enabled
    const hasDirectMessaging = await this.checkFeatureEnabled(employerId, 'directMessagingEnabled');

    if (!hasDirectMessaging) {
      throw new ForbiddenException('Direct messaging is not available on your current plan');
    }

    // Create the message
    const directMessage: DirectMessage = {
      _id: Date.now().toString(), // Simple ID generation for demo
      from: employerId,
      to: candidateId,
      applicationId,
      subject,
      message,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store the message (in production, use a proper database)
    this.messages.push(directMessage);

    // Send notification to candidate
    await this.notifyCandidate(candidateId, subject, message);

    return directMessage;
  }

  /**
   * Get messages for a user (employer or candidate)
   */
  async getMessages(userId: string, userRole: 'employer' | 'candidate'): Promise<DirectMessage[]> {
    if (userRole === 'employer') {
      return this.messages.filter(msg => msg.from === userId);
    } else {
      return this.messages.filter(msg => msg.to === userId);
    }
  }

  /**
   * Get conversation between employer and candidate
   */
  async getConversation(
    employerId: string,
    candidateId: string,
    applicationId: string,
  ): Promise<DirectMessage[]> {
    return this.messages.filter(
      msg =>
        msg.from === employerId &&
        msg.to === candidateId &&
        msg.applicationId === applicationId
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string, userId: string): Promise<void> {
    const message = this.messages.find(msg => msg._id === messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only the recipient can mark as read
    if (message.to !== userId) {
      throw new ForbiddenException('You can only mark your own messages as read');
    }

    message.isRead = true;
    message.updatedAt = new Date();
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(userId: string, userRole: 'employer' | 'candidate'): Promise<number> {
    if (userRole === 'employer') {
      return this.messages.filter(msg => msg.from === userId && !msg.isRead).length;
    } else {
      return this.messages.filter(msg => msg.to === userId && !msg.isRead).length;
    }
  }

  /**
   * Get message statistics for employer
   */
  async getMessageStats(employerId: string): Promise<{
    totalSent: number;
    totalReceived: number;
    unreadCount: number;
    conversationsCount: number;
  }> {
    const sentMessages = this.messages.filter(msg => msg.from === employerId);
    const receivedMessages = this.messages.filter(msg => msg.to === employerId);
    const unreadCount = receivedMessages.filter(msg => !msg.isRead).length;
    
    // Count unique conversations
    const uniqueConversations = new Set(
      sentMessages.map(msg => `${msg.to}-${msg.applicationId}`)
    ).size;

    return {
      totalSent: sentMessages.length,
      totalReceived: receivedMessages.length,
      unreadCount,
      conversationsCount: uniqueConversations,
    };
  }

  /**
   * Notify candidate about new message
   */
  private async notifyCandidate(candidateId: string, subject: string, message: string): Promise<void> {
    // In a real implementation, you would:
    // 1. Send email notification
    // 2. Send push notification
    // 3. Update in-app notification system
    
    console.log(`Notifying candidate ${candidateId} about new message: ${subject}`);
    
    // For demo purposes, we'll just log it
    const candidate = await this.userModel.findById(candidateId);
    if (candidate) {
      console.log(`Email notification sent to ${candidate.email}`);
    }
  }

  /**
   * Get recent conversations for employer dashboard
   */
  async getRecentConversations(employerId: string, limit: number = 10): Promise<Array<{
    candidateId: string;
    candidateName: string;
    applicationId: string;
    lastMessage: string;
    lastMessageTime: Date;
    unreadCount: number;
  }>> {
    const employerMessages = this.messages.filter(msg => msg.from === employerId);
    
    // Group by candidate and application
    const conversations = new Map<string, {
      candidateId: string;
      applicationId: string;
      messages: DirectMessage[];
    }>();

    employerMessages.forEach(msg => {
      const key = `${msg.to}-${msg.applicationId}`;
      if (!conversations.has(key)) {
        conversations.set(key, {
          candidateId: msg.to,
          applicationId: msg.applicationId,
          messages: [],
        });
      }
      conversations.get(key)!.messages.push(msg);
    });

    // Get recent conversations with stats
    const recentConversations = await Promise.all(
      Array.from(conversations.values()).map(async (conv) => {
        const sortedMessages = conv.messages.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const lastMessage = sortedMessages[0];
        const unreadCount = conv.messages.filter(msg => !msg.isRead).length;

        // Get candidate name from user model
        const candidate = await this.userModel.findById(conv.candidateId).select('fullName');
        const candidateName = candidate?.fullName || 'Candidate';

        return {
          candidateId: conv.candidateId,
          candidateName,
          applicationId: conv.applicationId,
          lastMessage: lastMessage.message,
          lastMessageTime: lastMessage.createdAt,
          unreadCount,
        };
      })
    );

    return recentConversations
      .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime())
      .slice(0, limit);
  }

  /**
   * Check if a specific feature is enabled for the employer
   */
  private async checkFeatureEnabled(employerId: string, featureName: string): Promise<boolean> {
    try {
      // Get subscription from database
      const { Subscription, SubscriptionSchema } = await import('../subscriptions/schemas/subscription.schema');
      const subscriptionModel = this.userModel.db.model('Subscription', SubscriptionSchema);
      
      const subscription = await subscriptionModel.findOne({ user: employerId });
      if (!subscription) {
        return false; // No subscription = no features
      }

      // Check the specific feature
      return subscription[featureName] || false;
    } catch (error) {
      console.error('Error checking feature:', error);
      return false; // Default to false on error
    }
  }
}
