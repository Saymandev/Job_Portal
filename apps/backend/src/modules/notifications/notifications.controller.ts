import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('unreadOnly') unreadOnly: string | boolean = false,
  ) {
    const result = await this.notificationsService.getUserNotifications(
      userId,
      parseInt(page.toString()),
      parseInt(limit.toString()),
      unreadOnly === true || unreadOnly === 'true',
    );

    return {
      success: true,
      data: result.notifications,
      pagination: {
        page: parseInt(page.toString()),
        limit: parseInt(limit.toString()),
        total: result.total,
        totalPages: Math.ceil(result.total / parseInt(limit.toString())),
      },
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notifications count' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);

    return {
      success: true,
      data: { count },
    };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const notification = await this.notificationsService.markAsRead(id, userId);

    return {
      success: true,
      data: notification,
      message: 'Notification marked as read',
    };
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    const result = await this.notificationsService.markAllAsRead(userId);

    return {
      success: true,
      data: { modifiedCount: result.modifiedCount },
      message: 'All notifications marked as read',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  async deleteNotification(@Param('id') id: string, @CurrentUser('id') userId: string) {
    const deleted = await this.notificationsService.deleteNotification(id, userId);

    return {
      success: deleted,
      message: deleted ? 'Notification deleted' : 'Notification not found',
    };
  }
}
