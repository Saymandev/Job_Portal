import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagingPermissionsService } from './messaging-permissions.service';

@ApiTags('Messaging Permissions')
@Controller('messaging-permissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagingPermissionsController {
  constructor(private readonly messagingPermissionsService: MessagingPermissionsService) {}

  @Post('request')
  @ApiOperation({ summary: 'Request messaging permission' })
  async requestPermission(
    @CurrentUser('id') userId: string,
    @Body() body: {
      targetUser: string;
      relatedJob?: string;
      relatedApplication?: string;
      message?: string;
      expiresInDays?: number;
    },
  ) {
    const permission = await this.messagingPermissionsService.requestMessagingPermission({
      user: userId,
      ...body,
    });

    return {
      success: true,
      data: permission,
      message: 'Messaging permission request sent',
    };
  }

  @Patch(':id/respond')
  @ApiOperation({ summary: 'Respond to messaging permission request' })
  async respondToRequest(
    @Param('id') permissionId: string,
    @CurrentUser('id') userId: string,
    @Body() body: {
      status: 'approved' | 'rejected' | 'blocked';
      responseMessage?: string;
    },
  ) {
    const permission = await this.messagingPermissionsService.respondToPermissionRequest(
      permissionId,
      userId,
      body,
    );

    return {
      success: true,
      data: permission,
      message: `Permission request ${body.status}`,
    };
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Get my permission requests' })
  async getMyRequests(@CurrentUser('id') userId: string) {
    const requests = await this.messagingPermissionsService.getUserPermissionRequests(userId);

    return {
      success: true,
      data: requests,
    };
  }

  @Get('received-requests')
  @ApiOperation({ summary: 'Get received permission requests' })
  async getReceivedRequests(@CurrentUser('id') userId: string) {
    const requests = await this.messagingPermissionsService.getReceivedPermissionRequests(userId);

    return {
      success: true,
      data: requests,
    };
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active messaging permissions' })
  async getActivePermissions(@CurrentUser('id') userId: string) {
    const permissions = await this.messagingPermissionsService.getActivePermissions(userId);

    return {
      success: true,
      data: permissions,
    };
  }

  @Get('check/:targetUserId')
  @ApiOperation({ summary: 'Check messaging permission with another user' })
  async checkPermission(
    @CurrentUser('id') userId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    const result = await this.messagingPermissionsService.checkMessagingPermission(
      userId,
      targetUserId,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Patch(':id/revoke')
  @ApiOperation({ summary: 'Revoke messaging permission' })
  async revokePermission(
    @Param('id') permissionId: string,
    @CurrentUser('id') userId: string,
  ) {
    const permission = await this.messagingPermissionsService.revokePermission(
      permissionId,
      userId,
    );

    return {
      success: true,
      data: permission,
      message: 'Messaging permission revoked',
    };
  }

  @Post('block/:targetUserId')
  @ApiOperation({ summary: 'Block user from messaging' })
  async blockUser(
    @CurrentUser('id') userId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    const permission = await this.messagingPermissionsService.blockUser(userId, targetUserId);

    return {
      success: true,
      data: permission,
      message: 'User blocked from messaging',
    };
  }

  @Post('unblock/:targetUserId')
  @ApiOperation({ summary: 'Unblock user from messaging' })
  async unblockUser(
    @CurrentUser('id') userId: string,
    @Param('targetUserId') targetUserId: string,
  ) {
    await this.messagingPermissionsService.unblockUser(userId, targetUserId);

    return {
      success: true,
      message: 'User unblocked',
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get messaging permission statistics' })
  async getStats(@CurrentUser('id') userId: string) {
    const stats = await this.messagingPermissionsService.getPermissionStats(userId);

    return {
      success: true,
      data: stats,
    };
  }

  @Get('check-permissions')
  @ApiOperation({ summary: 'Check if user has messaging permissions based on subscription' })
  async checkMessagingPermissions(@CurrentUser('id') userId: string) {
    const result = await this.messagingPermissionsService.hasMessagingPermissions(userId);
    return {
      success: true,
      data: result,
    };
  }

  @Post('renew-expired')
  @ApiOperation({ summary: 'Renew all expired messaging permissions for premium users' })
  async renewExpiredPermissions(@CurrentUser('id') userId: string) {
    const result = await this.messagingPermissionsService.renewExpiredPermissions(userId);
    return {
      success: true,
      data: result,
    };
  }
}
