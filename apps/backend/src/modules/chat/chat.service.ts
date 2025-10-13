import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MessagingPermissionsService } from '../messaging-permissions/messaging-permissions.service';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { Message, MessageDocument } from './schemas/message.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    private messagingPermissionsService: MessagingPermissionsService,
  ) {}

  async createConversation(
    participants: string[], 
    jobId?: string,
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
    console.log('Creating admin conversation:', { adminId, targetUserId });
    
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
      console.log('Created new admin conversation:', conversation._id);
    } else {
      console.log('Found existing admin conversation:', conversation._id);
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
    console.log('Creating user to admin conversation:', { userId, adminId });
    
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
      console.log('Created new user-to-admin conversation:', conversation._id);
    } else {
      console.log('Found existing user-to-admin conversation:', conversation._id);
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
    console.log('🟠 createAdminMessage service called:', {
      conversationId,
      adminId,
      content,
      hasAttachment: !!attachment,
      timestamp: new Date().toISOString()
    });

    // Get conversation to validate it exists
    const conversation = await this.conversationModel.findById(conversationId);
    console.log('🟠 Found conversation:', {
      conversationId: conversation?._id,
      participants: conversation?.participants,
      isAdminConversation: conversation?.isAdminConversation,
      lastMessage: conversation?.lastMessage
    });
    
    if (!conversation) {
      console.log('🟠 ERROR: Conversation not found:', conversationId);
      throw new NotFoundException('Conversation not found');
    }

    // Verify admin is a participant
    if (!conversation.participants.includes(adminId)) {
      console.log('🟠 ERROR: Admin not participant:', {
        adminId,
        participants: conversation.participants
      });
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Validate content
    if (!content && !attachment) {
      console.log('🟠 ERROR: No content or attachment provided');
      throw new BadRequestException('Message must have either content or attachment');
    }

    console.log('🟠 Creating admin message in database...');
    // Create message (admin messages bypass permission checks)
    const message = await this.messageModel.create({
      conversation: conversationId,
      sender: adminId,
      content: content || '',
      attachment,
      isAdminMessage: true, // Mark as admin message
    });

    console.log('🟠 Admin message created in database:', {
      messageId: message._id,
      conversationId: message.conversation,
      senderId: message.sender,
      content: message.content,
      isAdminMessage: message.isAdminMessage,
      createdAt: (message as any).createdAt
    });

    // Update conversation with last message
    await this.conversationModel.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      $inc: { unreadCount: 1 },
    });

    console.log('🟠 Updated conversation with last message');

    const populatedMessage = await message.populate('sender', 'fullName avatar email role');
    console.log('🟠 Returning populated message:', {
      messageId: populatedMessage._id,
      sender: populatedMessage.sender
    });

    return populatedMessage;
  }

  async getAdminConversations(adminId: string): Promise<ConversationDocument[]> {
    console.log('Fetching admin conversations for admin:', adminId);
    
    const conversations = await this.conversationModel
      .find({
        participants: { $in: [adminId] },
        isAdminConversation: true,
      })
      .populate('participants', 'fullName avatar email role')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });
      
    console.log('Found admin conversations:', conversations.length);
    conversations.forEach(conv => {
      console.log('Conversation:', {
        id: conv._id,
        participants: conv.participants.map(p => ({ 
          id: typeof p === 'string' ? p : (p as any)._id, 
          name: typeof p === 'string' ? 'Unknown' : (p as any).fullName 
        })),
        isAdminConversation: conv.isAdminConversation
      });
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
    
    console.log(`Cleaned up ${result.deletedCount} conversations for admin ${adminId}`);
    return { deletedCount: result.deletedCount };
  }
}

