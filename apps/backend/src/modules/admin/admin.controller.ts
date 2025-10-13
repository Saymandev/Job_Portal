import { Role, Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { PlatformSettingsData, PlatformSettingsService } from './platform-settings.service';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  async getDashboard() {
    const stats = await this.adminService.getDashboardStats();

    return {
      success: true,
      data: stats,
    };
  }

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  async getDashboardStats() {
    const stats = await this.adminService.getDashboardStatsForFrontend();

    return {
      success: true,
      data: stats,
    };
  }

  @Get('system/health')
  @ApiOperation({ summary: 'Get system health status' })
  async getSystemHealth() {
    const health = await this.adminService.getSystemHealth();

    return {
      success: true,
      data: health,
    };
  }

  @Get('users/recent')
  @ApiOperation({ summary: 'Get recent users' })
  async getRecentUsers(@Query('limit') limit?: string) {
    const users = await this.adminService.getRecentUsers(limit ? parseInt(limit) : 10);

    return {
      success: true,
      data: users,
    };
  }

  @Get('jobs/pending')
  @ApiOperation({ summary: 'Get pending jobs for approval' })
  async getPendingJobs(@Query('limit') limit?: string) {
    const jobs = await this.adminService.getPendingJobs(limit ? parseInt(limit) : 10);

    return {
      success: true,
      data: jobs,
    };
  }

  @Get('activity/recent')
  @ApiOperation({ summary: 'Get recent system activity' })
  async getRecentActivity(@Query('limit') limit?: string) {
    const activity = await this.adminService.getRecentActivity(limit ? parseInt(limit) : 10);

    return {
      success: true,
      data: activity,
    };
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  async getAllUsers(@Query() filters: any) {
    const users = await this.adminService.getAllUsers(filters);

    return {
      success: true,
      data: users,
    };
  }

  @Put('users/:id/toggle-status')
  @ApiOperation({ summary: 'Toggle user active status' })
  async toggleUserStatus(@Param('id') id: string) {
    const user = await this.adminService.toggleUserStatus(id);

    return {
      success: true,
      message: 'User status updated',
      data: user,
    };
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get all jobs' })
  async getAllJobs(@Query() filters: any) {
    const jobs = await this.adminService.getAllJobs(filters);

    return {
      success: true,
      data: jobs,
    };
  }

  @Put('jobs/:id')
  @ApiOperation({ summary: 'Update job status' })
  async updateJobStatus(@Param('id') id: string, @Body() updateData: any) {
    const job = await this.adminService.updateJobStatus(id, updateData);

    return {
      success: true,
      message: 'Job updated successfully',
      data: job,
    };
  }

  @Get('applications')
  @ApiOperation({ summary: 'Get all applications' })
  async getAllApplications() {
    const applications = await this.adminService.getAllApplications();

    return {
      success: true,
      data: applications,
    };
  }

  @Get('companies')
  @ApiOperation({ summary: 'Get all companies' })
  async getAllCompanies() {
    const companies = await this.adminService.getAllCompanies();

    return {
      success: true,
      data: companies,
    };
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get all subscriptions' })
  async getAllSubscriptions() {
    const subscriptions = await this.adminService.getAllSubscriptions();

    return {
      success: true,
      data: subscriptions,
    };
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue statistics' })
  async getRevenueStats() {
    const stats = await this.adminService.getRevenueStats();

    return {
      success: true,
      data: stats,
    };
  }

  @Get('users/:id/activities')
  @ApiOperation({ summary: 'Get user activities' })
  async getUserActivities(@Param('id') userId: string) {
    const activities = await this.adminService.getUserActivities(userId);
    return { success: true, data: activities };
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get platform settings' })
  async getSettings() {
    const settings = await this.platformSettingsService.getSettings();
    return { success: true, data: settings };
  }

  @Post('settings')
  @ApiOperation({ summary: 'Update platform settings' })
  async updateSettings(@Body() settingsData: PlatformSettingsData) {
    await this.platformSettingsService.updateSettings(settingsData);
    return { success: true, message: 'Settings updated successfully' };
  }

  @Post('settings/reset')
  @ApiOperation({ summary: 'Reset settings to defaults' })
  async resetSettings() {
    await this.platformSettingsService.resetToDefaults();
    return { success: true, message: 'Settings reset to defaults' };
  }

  @Get('settings/stats')
  @ApiOperation({ summary: 'Get system statistics for settings page' })
  async getSettingsStats() {
    const stats = await this.platformSettingsService.getSystemStats();
    return { success: true, data: stats };
  }

  @Get('subscriptions/management')
  @ApiOperation({ summary: 'Get subscription management data' })
  async getSubscriptionManagement() {
    const data = await this.adminService.getSubscriptionManagement();
    return { success: true, data };
  }

  @Put('subscriptions/:id/status')
  @ApiOperation({ summary: 'Update subscription status' })
  async updateSubscriptionStatus(
    @Param('id') subscriptionId: string,
    @Body() body: { status: string }
  ) {
    const subscription = await this.adminService.updateSubscriptionStatus(subscriptionId, body.status);
    return { success: true, message: 'Subscription status updated', data: subscription };
  }

  @Put('subscriptions/:id/plan')
  @ApiOperation({ summary: 'Update subscription plan' })
  async updateSubscriptionPlan(
    @Param('id') subscriptionId: string,
    @Body() body: { plan: string }
  ) {
    const subscription = await this.adminService.updateSubscriptionPlan(subscriptionId, body.plan);
    return { success: true, message: 'Subscription plan updated', data: subscription };
  }

  @Post('subscriptions/:id/cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(@Param('id') subscriptionId: string) {
    const subscription = await this.adminService.cancelSubscription(subscriptionId);
    return { success: true, message: 'Subscription cancelled', data: subscription };
  }

  @Get('subscriptions/stats')
  @ApiOperation({ summary: 'Get subscription statistics' })
  async getSubscriptionStats() {
    const stats = await this.adminService.getSubscriptionStats();
    return { success: true, data: stats };
  }
}

