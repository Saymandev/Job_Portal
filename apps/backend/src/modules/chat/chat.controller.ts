import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role, Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create or get conversation' })
  async createConversation(
    @CurrentUser('id') userId: string,
    @Body() body: { participants: string[]; jobId?: string; applicationId?: string },
  ) {
    const conversation = await this.chatService.createConversation(
      body.participants, 
      body.jobId,
      body.applicationId,
      userId
    );

    return {
      success: true,
      data: conversation,
    };
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get user conversations' })
  async getConversations(@CurrentUser('id') userId: string) {
    const conversations = await this.chatService.getConversations(userId);

    return {
      success: true,
      data: conversations,
    };
  }

  @Get('test')
  @ApiOperation({ summary: 'Test endpoint to verify backend is running with new code' })
  async test() {
    return {
      success: true,
      message: 'Backend is running with updated messaging permissions code',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('websocket-status')
  @ApiOperation({ summary: 'Check WebSocket server status' })
  async getWebSocketStatus() {
    return {
      success: true,
      message: 'WebSocket server is running and ready to accept connections',
      timestamp: new Date().toISOString(),
      endpoint: 'ws://localhost:5000/socket.io/',
    };
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  async getConversation(@Param('id') id: string) {
    const conversation = await this.chatService.getConversationById(id);

    return {
      success: true,
      data: conversation,
    };
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get conversation messages' })
  async getMessages(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const messages = await this.chatService.getMessages(id, page, limit);

    return {
      success: true,
      data: messages,
    };
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send message to conversation' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('attachment'))
  async sendMessage(
    @Param('id') conversationId: string,
    @CurrentUser('id') userId: string,
    @Body('content') content: string,
    @UploadedFile() attachment?: Express.Multer.File,
  ) {
    let attachmentData;
    
    if (attachment) {
      // Determine if it's a Cloudinary URL or local file path
      const isCloudinaryUrl = attachment.path?.includes('cloudinary.com') || attachment.path?.includes('res.cloudinary.com');
      
      attachmentData = {
        filename: attachment.originalname,
        url: isCloudinaryUrl ? attachment.path : `/uploads/${attachment.filename}`,
        mimetype: attachment.mimetype,
        size: attachment.size,
      };
    }

    const message = await this.chatService.createMessage(
      conversationId,
      userId,
      content,
      attachmentData,
    );

    // Note: Real-time messaging is handled by the socket gateway when sendMessage event is received
    // No need to emit here as it would cause duplicate messages

    return {
      success: true,
      data: message,
    };
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  async markConversationAsRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.chatService.markConversationAsRead(id, userId);

    return {
      success: true,
      message: 'Conversation marked as read',
    };
  }

  // Admin messaging endpoints (bypass permissions)
  @Get('admin/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all users for admin messaging' })
  async getAllUsersForAdminMessaging(@CurrentUser('id') adminId: string) {
    const users = await this.chatService.getAllUsersForAdminMessaging(adminId);

    return {
      success: true,
      data: users,
    };
  }

  @Get('admin/conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get admin conversations' })
  async getAdminConversations(@CurrentUser('id') adminId: string) {
    const conversations = await this.chatService.getAdminConversations(adminId);

    return {
      success: true,
      data: conversations,
    };
  }

  @Post('admin/conversations/cleanup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Clean up old conversations without admin flag' })
  async cleanupAdminConversations(@CurrentUser('id') adminId: string) {
    // Remove any conversations where admin is participant but isAdminConversation is not set
    const result = await this.chatService.cleanupOldAdminConversations(adminId);
    
    return {
      success: true,
      message: `Cleaned up ${result.deletedCount} old conversations`,
      data: { deletedCount: result.deletedCount }
    };
  }

  @Post('user-to-admin/conversations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create conversation between user and admin' })
  async createUserToAdminConversation(
    @CurrentUser('id') userId: string,
    @Body() body: { adminId: string; initialMessage?: string },
  ) {
    const conversation = await this.chatService.createUserToAdminConversation(
      userId,
      body.adminId,
      body.initialMessage,
    );

    return {
      success: true,
      data: conversation,
    };
  }

  @Post('admin/conversations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create admin conversation with user' })
  async createAdminConversation(
    @CurrentUser('id') adminId: string,
    @Body() body: { targetUserId: string; initialMessage?: string },
  ) {
    const conversation = await this.chatService.createAdminConversation(
      adminId,
      body.targetUserId,
      body.initialMessage,
    );

    return {
      success: true,
      data: conversation,
    };
  }

  @Get('admin/conversations/:id/messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get admin conversation messages' })
  async getAdminMessages(
    @Param('id') conversationId: string,
    @CurrentUser('id') adminId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    const messages = await this.chatService.getAdminMessages(conversationId, adminId, page, limit);

    return {
      success: true,
      data: messages,
    };
  }

  @Post('admin/conversations/:id/messages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Send admin message' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('attachment'))
  async sendAdminMessage(
    @Param('id') conversationId: string,
    @CurrentUser('id') adminId: string,
    @Body('content') content: string,
    @UploadedFile() attachment?: Express.Multer.File,
  ) {
    

    let attachmentData;
    
    if (attachment) {
      const isCloudinaryUrl = attachment.path?.includes('cloudinary.com') || attachment.path?.includes('res.cloudinary.com');
      
      attachmentData = {
        filename: attachment.originalname,
        url: isCloudinaryUrl ? attachment.path : `/uploads/${attachment.filename}`,
        mimetype: attachment.mimetype,
        size: attachment.size,
      };
    }

   
    const message = await this.chatService.createAdminMessage(
      conversationId,
      adminId,
      content,
      attachmentData,
    );

    

    // Emit real-time message to connected clients
    
    this.chatGateway.server.to(`conversation:${conversationId}`).emit('newMessage', message);

    return {
      success: true,
      data: message,
    };
  }
}

