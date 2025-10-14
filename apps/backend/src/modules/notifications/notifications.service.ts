import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { NotificationsGateway } from './notifications.gateway';
import { Notification, NotificationDocument } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) 
    private notificationModel: Model<NotificationDocument>,
    private mailService: MailService,
    private usersService: UsersService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async createNotification(data: {
    user: string;
    title: string;
    message: string;
    type?: string;
    job?: string;
    application?: string;
    conversation?: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
  }): Promise<NotificationDocument> {
    // Create in-app notification
    const notification = await this.notificationModel.create(data);

    // Send email notification if user has it enabled
    try {
      const user = await this.usersService.findById(data.user);
      const prefs = user.notificationPreferences || {
        emailNotifications: true,
        pushNotifications: false,
        newJobMatches: true,
        applicationUpdates: true,
        messages: true,
        weeklyDigest: false,
      };

      if (prefs.emailNotifications) {
        // Check notification type preferences
        const shouldSendEmail = 
          (data.type === 'application' && prefs.applicationUpdates) ||
          (data.type === 'interview' && prefs.applicationUpdates) ||
          (data.type === 'message' && prefs.messages) ||
          (data.type === 'info' && prefs.newJobMatches) ||
          (data.type === 'job_match' && prefs.newJobMatches) ||
          (data.type === 'subscription' && prefs.emailNotifications) ||
          (data.type === 'reminder' && prefs.emailNotifications) ||
          data.type === 'system' ||
          data.type === 'admin' ||
          data.type === 'digest' ||
          data.type === 'recommendation';

        if (shouldSendEmail) {
          await this.mailService.sendNotificationEmail(user.email, data.title, data.message, data.actionUrl);
        }
      }
    } catch (error) {
      console.error('Error sending email notification:', error);
      // Don't fail the notification creation if email fails
    }

    // Send real-time notification via WebSocket
    try {
      console.log(`📡 Sending real-time notification to user ${data.user}:`, notification.title);
      this.notificationsGateway.sendNotificationToUser(data.user, notification);
      
      // Also update unread count
      const unreadCount = await this.getUnreadCount(data.user);
      this.notificationsGateway.updateUnreadCount(data.user, unreadCount);
      console.log(`📊 Updated unread count for user ${data.user}: ${unreadCount}`);
    } catch (error) {
      console.error('Error sending real-time notification:', error);
      // Don't fail the notification creation if WebSocket fails
    }

    return notification;
  }


  async getUserNotifications(
    userId: string,
    page = 1,
    limit = 20,
    unreadOnly = false,
  ): Promise<{ notifications: NotificationDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const filter: any = { user: userId };
    if (unreadOnly) {
      filter.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('job', 'title company')
        .populate('application', 'status')
        .populate('conversation', 'participants')
        .exec(),
      this.notificationModel.countDocuments(filter),
    ]);

    return { notifications, total };
  }

  async markAsRead(notificationId: string, userId: string): Promise<NotificationDocument> {
    return this.notificationModel.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isRead: true, updatedAt: new Date() },
      { new: true },
    );
  }

  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel.updateMany(
      { user: userId, isRead: false },
      { isRead: true, updatedAt: new Date() },
    );
    return { modifiedCount: result.modifiedCount };
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.notificationModel.deleteOne({
      _id: notificationId,
      user: userId,
    });
    return result.deletedCount > 0;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      user: userId,
      isRead: false,
    });
  }

  async createBulkNotifications(
    notifications: Array<{
      user: string;
      title: string;
      message: string;
      type?: string;
      job?: string;
      application?: string;
      actionUrl?: string;
      metadata?: Record<string, any>;
    }>,
  ): Promise<NotificationDocument[]> {
    return this.notificationModel.insertMany(notifications) as Promise<NotificationDocument[]>;
  }

  // System notification methods
  async notifyJobApplicationReceived(employerId: string, applicationId: string, jobTitle: string): Promise<void> {
    await this.createNotification({
      user: employerId,
      title: 'New Job Application',
      message: `You have received a new application for "${jobTitle}"`,
      type: 'application',
      application: applicationId,
      actionUrl: `/employer/applicants/${applicationId}`,
      metadata: { jobTitle },
    });
  }

  async notifyApplicationStatusUpdate(applicantId: string, status: string, jobTitle: string): Promise<void> {
    await this.createNotification({
      user: applicantId,
      title: 'Application Status Update',
      message: `Your application for "${jobTitle}" has been updated to: ${status}`,
      type: 'application',
      actionUrl: '/applications',
      metadata: { status, jobTitle },
    });
  }

  async notifyInterviewScheduled(
    applicantId: string,
    employerId: string,
    jobTitle: string,
    interviewDate: Date,
  ): Promise<void> {
    const notifications = [
      {
        user: applicantId,
        title: 'Interview Scheduled',
        message: `You have an interview scheduled for "${jobTitle}" on ${interviewDate.toLocaleDateString()}`,
        type: 'interview',
        actionUrl: '/applications',
        metadata: { jobTitle, interviewDate },
      },
      {
        user: employerId,
        title: 'Interview Scheduled',
        message: `You have scheduled an interview for "${jobTitle}" on ${interviewDate.toLocaleDateString()}`,
        type: 'interview',
        actionUrl: '/employer/applicants',
        metadata: { jobTitle, interviewDate },
      },
    ];

    await this.createBulkNotifications(notifications);
  }

  async notifyNewMessage(
    recipientId: string,
    senderName: string,
    conversationId: string,
    messagePreview: string,
  ): Promise<void> {
    await this.createNotification({
      user: recipientId,
      title: `New message from ${senderName}`,
      message: messagePreview,
      type: 'message',
      conversation: conversationId,
      actionUrl: `/messages?conversation=${conversationId}`,
      metadata: { senderName },
    });
  }

  async notifyJobPosted(jobId: string, jobTitle: string, companyName: string): Promise<void> {
    // This would typically notify relevant job seekers based on their preferences
    // For now, we'll create a system notification
    await this.createNotification({
      user: 'system', // Special system user ID
      title: 'New Job Posted',
      message: `${companyName} has posted a new job: "${jobTitle}"`,
      type: 'system',
      job: jobId,
      actionUrl: `/jobs/${jobId}`,
      metadata: { companyName, jobTitle },
    });
  }

  async cleanupOldNotifications(daysOld = 30): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationModel.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true,
    });

    return { deletedCount: result.deletedCount };
  }
}
