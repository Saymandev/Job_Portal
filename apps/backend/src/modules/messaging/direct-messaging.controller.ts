import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role, Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DirectMessagingService } from './direct-messaging.service';

interface SendMessageDto {
  candidateId: string;
  applicationId: string;
  subject: string;
  message: string;
}

interface MarkAsReadDto {
  messageId: string;
}

@ApiTags('Direct Messaging')
@Controller('messaging')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DirectMessagingController {
  constructor(private readonly directMessagingService: DirectMessagingService) {}

  @Post('send')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Send message to candidate' })
  async sendMessage(
    @CurrentUser('id') employerId: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    const message = await this.directMessagingService.sendMessage(
      employerId,
      sendMessageDto.candidateId,
      sendMessageDto.applicationId,
      sendMessageDto.subject,
      sendMessageDto.message,
    );

    return {
      success: true,
      message: 'Message sent successfully',
      data: message,
    };
  }

  @Get('messages')
  @ApiOperation({ summary: 'Get user messages' })
  async getMessages(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Query('type') type?: 'sent' | 'received',
  ) {
    const messages = await this.directMessagingService.getMessages(
      userId,
      userRole as 'employer' | 'candidate',
    );

    let filteredMessages = messages;
    if (type === 'sent') {
      filteredMessages = messages.filter(msg => msg.from === userId);
    } else if (type === 'received') {
      filteredMessages = messages.filter(msg => msg.to === userId);
    }

    return {
      success: true,
      data: filteredMessages,
    };
  }

  @Get('conversation/:applicationId/:candidateId')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get conversation with candidate' })
  async getConversation(
    @CurrentUser('id') employerId: string,
    @Param('applicationId') applicationId: string,
    @Param('candidateId') candidateId: string,
  ) {
    const messages = await this.directMessagingService.getConversation(
      employerId,
      candidateId,
      applicationId,
    );

    return {
      success: true,
      data: messages,
    };
  }

  @Put('mark-read')
  @ApiOperation({ summary: 'Mark message as read' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() markAsReadDto: MarkAsReadDto,
  ) {
    await this.directMessagingService.markAsRead(
      markAsReadDto.messageId,
      userId,
    );

    return {
      success: true,
      message: 'Message marked as read',
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread message count' })
  async getUnreadCount(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    const count = await this.directMessagingService.getUnreadCount(
      userId,
      userRole as 'employer' | 'candidate',
    );

    return {
      success: true,
      data: { unreadCount: count },
    };
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get messaging statistics' })
  async getMessageStats(@CurrentUser('id') employerId: string) {
    const stats = await this.directMessagingService.getMessageStats(employerId);

    return {
      success: true,
      data: stats,
    };
  }

  @Get('recent-conversations')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get recent conversations' })
  async getRecentConversations(
    @CurrentUser('id') employerId: string,
    @Query('limit') limit?: string,
  ) {
    const conversations = await this.directMessagingService.getRecentConversations(
      employerId,
      limit ? parseInt(limit) : 10,
    );

    return {
      success: true,
      data: conversations,
    };
  }
}
