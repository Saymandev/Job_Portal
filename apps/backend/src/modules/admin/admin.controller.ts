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

  // ========== ADVANCED ANALYTICS MANAGEMENT ==========

  @Get('analytics/insights')
  @ApiOperation({ summary: 'Get all analytics insights across all users' })
  async getAllAnalyticsInsights(@Query('limit') limit?: number, @Query('page') page?: number) {
    const insights = await this.adminService.getAllAnalyticsInsights(limit || 50, page || 1);
    return {
      success: true,
      data: insights,
    };
  }

  @Get('analytics/insights/:userId')
  @ApiOperation({ summary: 'Get analytics insights for a specific user' })
  async getUserAnalyticsInsights(@Param('userId') userId: string) {
    const insights = await this.adminService.getUserAnalyticsInsights(userId);
    return {
      success: true,
      data: insights,
    };
  }

  @Post('analytics/insights/:insightId/archive')
  @ApiOperation({ summary: 'Archive an analytics insight' })
  async archiveAnalyticsInsight(@Param('insightId') insightId: string) {
    await this.adminService.archiveAnalyticsInsight(insightId);
    return {
      success: true,
      message: 'Analytics insight archived successfully',
    };
  }

  // ========== API KEYS MANAGEMENT ==========

  @Get('api-keys')
  @ApiOperation({ summary: 'Get all API keys across all users' })
  async getAllApiKeys(@Query('limit') limit?: number, @Query('page') page?: number) {
    const apiKeys = await this.adminService.getAllApiKeys(limit || 50, page || 1);
    return {
      success: true,
      data: apiKeys,
    };
  }

  @Post('api-keys/:keyId/revoke')
  @ApiOperation({ summary: 'Revoke an API key' })
  async revokeApiKey(@Param('keyId') keyId: string) {
    await this.adminService.revokeApiKey(keyId);
    return {
      success: true,
      message: 'API key revoked successfully',
    };
  }

  // ========== SALARY DATA MANAGEMENT ==========

  @Get('salary-data/status')
  @ApiOperation({ summary: 'Get salary data update status and statistics' })
  async getSalaryDataStatus() {
    const status = await this.adminService.getSalaryDataStatus();
    return {
      success: true,
      data: status,
    };
  }

  @Post('salary-data/update')
  @ApiOperation({ summary: 'Manually trigger salary data update' })
  async triggerSalaryDataUpdate() {
    const result = await this.adminService.triggerSalaryDataUpdate();
    return {
      success: true,
      data: result,
    };
  }

  @Post('salary-data/clear-cache')
  @ApiOperation({ summary: 'Clear salary data cache' })
  async clearSalaryDataCache() {
    await this.adminService.clearSalaryDataCache();
    return {
      success: true,
      message: 'Salary data cache cleared successfully',
    };
  }

  // ========== INTERVIEW MANAGEMENT ==========

  @Get('interviews/templates')
  @ApiOperation({ summary: 'Get all interview templates across all users' })
  async getAllInterviewTemplates(
    @Query('limit') limit?: number, 
    @Query('page') page?: number,
    @Query('search') search?: string,
    @Query('industry') industry?: string,
    @Query('difficulty') difficulty?: string,
    @Query('isPublic') isPublic?: string
  ) {
    const templates = await this.adminService.getAllInterviewTemplates(
      limit || 50, 
      page || 1,
      search,
      industry,
      difficulty,
      isPublic
    );
    return {
      success: true,
      data: templates,
    };
  }

  @Get('interviews/sessions')
  @ApiOperation({ summary: 'Get all interview sessions across all users' })
  async getAllInterviewSessions(
    @Query('limit') limit?: number, 
    @Query('page') page?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string
  ) {
    const sessions = await this.adminService.getAllInterviewSessions(
      limit || 50, 
      page || 1,
      search,
      status,
      type
    );
    return {
      success: true,
      data: sessions,
    };
  }

  // ========== ACCOUNT MANAGER MANAGEMENT ==========

  @Get('account-managers')
  @ApiOperation({ summary: 'Get all account managers and their assignments' })
  async getAllAccountManagers() {
    const managers = await this.adminService.getAllAccountManagers();
    return {
      success: true,
      data: managers,
    };
  }

  @Post('account-managers/:managerId/assign')
  @ApiOperation({ summary: 'Assign an account manager to a user' })
  async assignAccountManager(@Param('managerId') managerId: string, @Body() body: { userId: string }) {
    await this.adminService.assignAccountManager(managerId, body.userId);
    return {
      success: true,
      message: 'Account manager assigned successfully',
    };
  }

  // ========== SUPPORT MANAGEMENT ==========

  @Get('support/tickets')
  @ApiOperation({ summary: 'Get all support tickets' })
  async getAllSupportTickets(@Query('status') status?: string, @Query('priority') priority?: string) {
    const tickets = await this.adminService.getAllSupportTickets(status, priority);
    return {
      success: true,
      data: tickets,
    };
  }

  @Post('support/tickets/:ticketId/assign')
  @ApiOperation({ summary: 'Assign a support ticket to an admin' })
  async assignSupportTicket(@Param('ticketId') ticketId: string, @Body() body: { adminId: string }) {
    await this.adminService.assignSupportTicket(ticketId, body.adminId);
    return {
      success: true,
      message: 'Support ticket assigned successfully',
    };
  }

  // ========== WHITE-LABEL MANAGEMENT ==========

  @Get('white-label/configurations')
  @ApiOperation({ summary: 'Get all white-label configurations' })
  async getAllWhiteLabelConfigurations(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('company') company?: string
  ) {
    const configurations = await this.adminService.getAllWhiteLabelConfigurations(
      limit || 50,
      page || 1,
      search,
      status,
      type,
      company
    );
    return {
      success: true,
      data: configurations,
    };
  }

  @Post('white-label/configurations/:configId/approve')
  @ApiOperation({ summary: 'Approve a white-label configuration' })
  async approveWhiteLabelConfiguration(@Param('configId') configId: string) {
    await this.adminService.approveWhiteLabelConfiguration(configId);
    return {
      success: true,
      message: 'White-label configuration approved successfully',
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
// test
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
  async getAllSubscriptions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('plan') plan?: string,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    const subscriptions = await this.adminService.getAllSubscriptions(
      page || 1,
      limit || 10,
      plan,
      status,
      search
    );

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

  @Get('revenue/charts')
  @ApiOperation({ summary: 'Get revenue charts data' })
  async getRevenueCharts() {
    const charts = await this.adminService.getRevenueCharts();

    return {
      success: true,
      data: charts,
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

  @Post('subscriptions/:id/cancel')
  @ApiOperation({ summary: 'Cancel user subscription (Admin only)' })
  async cancelUserSubscription(@Param('id') subscriptionId: string) {
    const result = await this.adminService.cancelUserSubscription(subscriptionId);
    return { 
      success: true, 
      message: 'User subscription has been cancelled',
      data: result 
    };
  }

  @Post('subscriptions/:id/reactivate')
  @ApiOperation({ summary: 'Reactivate user subscription (Admin only)' })
  async reactivateUserSubscription(@Param('id') subscriptionId: string) {
    const result = await this.adminService.reactivateUserSubscription(subscriptionId);
    return { 
      success: true, 
      message: 'User subscription has been reactivated',
      data: result 
    };
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

  // ========== MESSAGING MANAGEMENT ==========

  @Get('messaging/conversations')
  @ApiOperation({ summary: 'Get all conversations for admin monitoring' })
  async getAllConversations(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('status') status?: string
  ) {
    const conversations = await this.adminService.getAllConversations(
      limit || 50,
      page || 1,
      search,
      type,
      status
    );
    return {
      success: true,
      data: conversations,
    };
  }

  @Get('messaging/conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages for a specific conversation' })
  async getConversationMessages(
    @Param('id') conversationId: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number
  ) {
    const messages = await this.adminService.getConversationMessages(
      conversationId,
      limit || 50,
      page || 1
    );
    return {
      success: true,
      data: messages,
    };
  }

  @Get('messaging/stats')
  @ApiOperation({ summary: 'Get messaging statistics' })
  async getMessagingStats() {
    const stats = await this.adminService.getMessagingStats();
    return {
      success: true,
      data: stats,
    };
  }

  // ========== BRANDING MANAGEMENT ==========

  @Get('branding/configurations')
  @ApiOperation({ summary: 'Get all branding configurations for admin review' })
  async getAllBrandingConfigurations(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('company') company?: string
  ) {
    const configurations = await this.adminService.getAllWhiteLabelConfigurations(
      limit || 50,
      page || 1,
      search,
      status,
      type,
      company
    );
    return {
      success: true,
      data: configurations,
    };
  }

  @Post('branding/configurations/:id/approve')
  @ApiOperation({ summary: 'Approve a branding configuration' })
  async approveBrandingConfiguration(@Param('id') configId: string) {
    await this.adminService.approveWhiteLabelConfiguration(configId);
    return {
      success: true,
      message: 'Branding configuration approved successfully',
    };
  }

  @Post('branding/configurations/:id/reject')
  @ApiOperation({ summary: 'Reject a branding configuration' })
  async rejectBrandingConfiguration(@Param('id') configId: string, @Body() body: { reason: string }) {
    await this.adminService.rejectWhiteLabelConfiguration(configId, body.reason);
    return {
      success: true,
      message: 'Branding configuration rejected successfully',
    };
  }

  @Get('branding/stats')
  @ApiOperation({ summary: 'Get branding statistics' })
  async getBrandingStats() {
    const stats = await this.adminService.getBrandingStats();
    return {
      success: true,
      data: stats,
    };
  }

  // ========== CONTENT MODERATION ==========

  @Get('moderation/jobs')
  @ApiOperation({ summary: 'Get jobs for content moderation' })
  async getJobsForModeration(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string
  ) {
    const jobs = await this.adminService.getJobsForModeration(
      limit || 50,
      page || 1,
      search,
      status,
      type
    );
    return {
      success: true,
      data: jobs,
    };
  }

  @Get('moderation/users')
  @ApiOperation({ summary: 'Get users for content moderation' })
  async getUsersForModeration(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('role') role?: string
  ) {
    const users = await this.adminService.getUsersForModeration(
      limit || 50,
      page || 1,
      search,
      status,
      role
    );
    return {
      success: true,
      data: users,
    };
  }

  @Get('moderation/flags')
  @ApiOperation({ summary: 'Get content flags for moderation' })
  async getContentFlags(
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('type') type?: string
  ) {
    const flags = await this.adminService.getContentFlags(
      limit || 50,
      page || 1,
      search,
      status,
      priority,
      type
    );
    return {
      success: true,
      data: flags,
    };
  }

  @Post('moderation/jobs/:id/action')
  @ApiOperation({ summary: 'Perform moderation action on a job' })
  async moderateJob(
    @Param('id') jobId: string,
    @Body() body: { action: string; reason?: string }
  ) {
    await this.adminService.moderateJob(jobId, body.action, body.reason);
    return {
      success: true,
      message: 'Job moderation action completed successfully',
    };
  }

  @Post('moderation/users/:id/action')
  @ApiOperation({ summary: 'Perform moderation action on a user' })
  async moderateUser(
    @Param('id') userId: string,
    @Body() body: { action: string; reason?: string }
  ) {
    await this.adminService.moderateUser(userId, body.action, body.reason);
    return {
      success: true,
      message: 'User moderation action completed successfully',
    };
  }

  @Post('moderation/flags/:id/action')
  @ApiOperation({ summary: 'Resolve a content flag' })
  async resolveContentFlag(
    @Param('id') flagId: string,
    @Body() body: { action: string; reason?: string }
  ) {
    await this.adminService.resolveContentFlag(flagId, body.action, body.reason);
    return {
      success: true,
      message: 'Content flag resolved successfully',
    };
  }

  @Get('moderation/stats')
  @ApiOperation({ summary: 'Get content moderation statistics' })
  async getModerationStats() {
    const stats = await this.adminService.getModerationStats();
    return {
      success: true,
      data: stats,
    };
  }
}

