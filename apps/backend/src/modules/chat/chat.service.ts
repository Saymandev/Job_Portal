import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MessagingPermissionsService } from '../messaging-permissions/messaging-permissions.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    private messagingPermissionsService: MessagingPermissionsService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async createConversation(
    participants: string[], 
    jobId?: string,
    applicationId?: string,
    requestingUserId?: string
  ): Promise<ConversationDocument> {
    // Validate participants
    if (participants.length !== 2) {
      throw new ForbiddenException('Conversations must have exactly 2 participants');
    }

    // Check messaging permissions if requesting user is specified
    if (requestingUserId) {
      // Convert requestingUserId to string for comparison
      const requestingUserIdStr = requestingUserId.toString();
      
      // Filter out null/undefined participants and find the other participant
      const validParticipants = participants.filter(p => p && p.toString());
      const otherUser = validParticipants.find(p => p.toString() !== requestingUserIdStr);
      
      if (!otherUser) {
        throw new ForbiddenException('Invalid participants for conversation');
      }
      
      // Check if requesting user has direct messaging feature enabled (admins bypass this check)
      const { User } = await import('../users/schemas/user.schema');
      const UserModel = this.conversationModel.db.model('User');
      const requestingUser = await UserModel.findById(requestingUserIdStr);
      
      if (requestingUser?.role !== 'admin') {
        const subscription = await this.subscriptionsService.getUserSubscription(requestingUserIdStr);
        if (subscription && !subscription.directMessagingEnabled) {
          throw new ForbiddenException('Direct messaging requires a Pro or Enterprise subscription');
        }
      }
      
      const permissionCheck = await this.messagingPermissionsService.checkMessagingPermission(
        requestingUserIdStr,
        otherUser,
      );

      if (!permissionCheck.canMessage) {
        throw new ForbiddenException(permissionCheck.reason || 'Messaging permission required');
      }
    }

    // Check if conversation already exists
    const existing = await this.conversationModel.findOne({
      participants: { $all: participants },
    });

    if (existing) {
      // Populate the existing conversation with user details
      return await this.conversationModel
        .findById(existing._id)
        .populate('participants', 'fullName avatar email role')
        .populate('job', 'title');
    }

    const newConversation = await this.conversationModel.create({
      participants,
      job: jobId,
      application: applicationId,
    });
    
    // Populate the participants with user details before returning
    return await this.conversationModel
      .findById(newConversation._id)
      .populate('participants', 'fullName avatar email role')
      .populate('job', 'title');
  }


  async getConversations(userId: string): Promise<ConversationDocument[]> {
    return this.conversationModel
      .find({ participants: userId })
      .populate('participants', 'fullName avatar email role')
      .populate('lastMessage')
      .populate('job', 'title')
      .sort({ updatedAt: -1 });
  }

  async getConversationById(conversationId: string): Promise<ConversationDocument> {
    return this.conversationModel
      .findById(conversationId)
      .populate('participants', 'fullName avatar email role')
      .populate('job', 'title');
  }

  async getMessages(conversationId: string, page = 1, limit = 50): Promise<MessageDocument[]> {
    const skip = (page - 1) * limit;

    return this.messageModel
      .find({ conversation: conversationId })
      .populate('sender', 'fullName avatar')
      .sort({ createdAt: -1 }) // Sort newest first for pagination
      .skip(skip)
      .limit(limit);
  }

  async createMessage(
    conversationId: string,
    senderId: string,
    content?: string,
    attachment?: {
      filename: string;
      url: string;
      mimetype: string;
      size: number;
    },
  ): Promise<MessageDocument> {
    // Get conversation to validate permissions
    const conversation = await this.conversationModel.findById(conversationId);
    
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Verify sender is a participant
    if (!conversation.participants.includes(senderId)) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Check if sender has direct messaging feature enabled (admins bypass this check)
    const { User } = await import('../users/schemas/user.schema');
    const UserModel = this.messageModel.db.model('User');
    const sender = await UserModel.findById(senderId);
    
    if (sender?.role !== 'admin') {
      const subscription = await this.subscriptionsService.getUserSubscription(senderId);
      if (subscription && !subscription.directMessagingEnabled) {
        throw new ForbiddenException('Direct messaging requires a Pro or Enterprise subscription');
      }
    }

    // Check messaging permissions between participants
    const [user1, user2] = conversation.participants;
    const otherUser = user1 === senderId ? user2 : user1;
    
    const permissionCheck = await this.messagingPermissionsService.checkMessagingPermission(
      senderId,
      otherUser,
    );

    if (!permissionCheck.canMessage) {
      throw new ForbiddenException(permissionCheck.reason || 'Messaging permission required');
    }

    // Validate that either content or attachment is provided
    if (!content && !attachment) {
      throw new BadRequestException('Message must have either content or attachment');
    }

    const message = await this.messageModel.create({
      conversation: conversationId,
      sender: senderId,
      content: content || '', // Provide empty string if no content
      attachment,
    });

    // Update conversation with last message
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      $inc: { unreadCount: 1 },
    });

    return message.populate('sender', 'fullName avatar');
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await this.messageModel.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        isRead: false,
      },
      {
        isRead: true,
      },
    );

    await this.conversationModel.findByIdAndUpdate(conversationId, {
      unreadCount: 0,
    });
  }

  async markConversationAsRead(conversationId: string, userId: string) {
    // Mark all messages in the conversation as read for this user
    await this.messageModel.updateMany(
      {
        conversation: new Types.ObjectId(conversationId),
        sender: { $ne: new Types.ObjectId(userId) },
        readBy: { $ne: new Types.ObjectId(userId) },
      },
      {
        $push: { readBy: new Types.ObjectId(userId) },
        $set: { isRead: true },
      },
    );

    // Reset unread count for this user
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      unreadCount: 0,
    });
  }

  // Admin messaging methods (bypass permissions)
  async createAdminConversation(
    adminId: string,
    targetUserId: string,
    initialMessage?: string
  ): Promise<ConversationDocument> {
   
    
    // Check if conversation already exists between admin and target user
    let conversation = await this.conversationModel.findOne({
      participants: { $all: [adminId, targetUserId] },
      isAdminConversation: true,
    });

    if (!conversation) {
      // Create new conversation
      conversation = await this.conversationModel.create({
        participants: [adminId, targetUserId],
        createdBy: adminId,
        isAdminConversation: true, // Mark as admin conversation
      });
      
    } else {
      
    }

    // If initial message provided, send it
    if (initialMessage) {
      await this.createAdminMessage(conversation._id.toString(), adminId, initialMessage);
    }

    return conversation.populate('participants', 'fullName avatar email role');
  }

  async createUserToAdminConversation(
    userId: string,
    adminId: string,
    initialMessage?: string
  ): Promise<ConversationDocument> {
    
    
    // Check if conversation already exists
    let conversation = await this.conversationModel.findOne({
      participants: { $all: [userId, adminId] },
      isAdminConversation: true,
    });

    if (!conversation) {
      // Create new conversation
      conversation = await this.conversationModel.create({
        participants: [userId, adminId],
        createdBy: adminId, // Admin is the creator
        isAdminConversation: true, // Mark as admin conversation
      });
      
    } else {
    
    }

    // If initial message provided, send it
    if (initialMessage) {
      await this.createMessage(conversation._id.toString(), userId, initialMessage);
    }

    return conversation.populate('participants', 'fullName avatar email role');
  }

  async createAdminMessage(
    conversationId: string,
    adminId: string,
    content: string,
    attachment?: {
      filename: string;
      url: string;
      mimetype: string;
      size: number;
    }
  ): Promise<MessageDocument> {
  

    // Get conversation to validate it exists
    const conversation = await this.conversationModel.findById(conversationId);
   
    
    if (!conversation) {
      
      throw new NotFoundException('Conversation not found');
    }

    // Verify admin is a participant
    if (!conversation.participants.includes(adminId)) {
      
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Validate content
    if (!content && !attachment) {
      
      throw new BadRequestException('Message must have either content or attachment');
    }

   
    // Create message (admin messages bypass permission checks)
    const message = await this.messageModel.create({
      conversation: conversationId,
      sender: adminId,
      content: content || '',
      attachment,
      isAdminMessage: true, // Mark as admin message
    });

   

    // Update conversation with last message
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      $inc: { unreadCount: 1 },
    });

    

    const populatedMessage = await message.populate('sender', 'fullName avatar email role');
    

    return populatedMessage;
  }

  async getAdminConversations(adminId: string): Promise<ConversationDocument[]> {
   
    
    const conversations = await this.conversationModel
      .find({
        participants: { $in: [adminId] },
        isAdminConversation: true,
      })
      .populate('participants', 'fullName avatar email role')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });
      
   
    conversations.forEach(conv => {
      
    });
    
    return conversations;
  }

  async getAdminMessages(conversationId: string, adminId: string, page = 1, limit = 50): Promise<MessageDocument[]> {
    // Verify admin has access to this conversation
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      participants: adminId,
      isAdminConversation: true,
    });

    if (!conversation) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    const skip = (page - 1) * limit;
    return this.messageModel
      .find({ conversation: conversationId })
      .populate('sender', 'fullName avatar email role')
      .sort({ createdAt: -1 }) // Sort newest first for pagination
      .skip(skip)
      .limit(limit);
  }

  async getAllUsersForAdminMessaging(adminId: string): Promise<any[]> {
    // Get all users except the admin
    const { User } = await import('../users/schemas/user.schema');
    const UserModel = this.conversationModel.db.model('User');
    
    return UserModel.find({
      _id: { $ne: adminId },
      isActive: true,
    })
    .select('fullName email avatar role createdAt')
    .sort({ fullName: 1 });
  }

  async cleanupOldAdminConversations(adminId: string): Promise<{ deletedCount: number }> {
    // Delete ALL conversations where admin is participant (to start fresh)
    const result = await this.conversationModel.deleteMany({
      participants: adminId
    });
    
    // Also delete all messages in those conversations
    await this.messageModel.deleteMany({
      sender: adminId
    });
    
    
    return { deletedCount: result.deletedCount };
  }
}

