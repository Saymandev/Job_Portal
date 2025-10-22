import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role, Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Body, Controller, Get, HttpCode, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobBoostService } from './job-boost.service';
import { SubscriptionPlan } from './schemas/subscription.schema';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly jobBoostService: JobBoostService,
  ) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe checkout session (Employers only)' })
  async createCheckoutSession(
    @CurrentUser('id') userId: string,
    @Body() body: { plan: SubscriptionPlan },
  ) {
    const result = await this.subscriptionsService.createCheckoutSession(userId, body.plan);

    return {
      success: true,
      data: result,
    };
  }

  @Post('verify-session')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify Stripe checkout session' })
  async verifySession(
    @CurrentUser('id') userId: string,
    @Body() body: { sessionId: string },
  ) {
    const result = await this.subscriptionsService.verifyCheckoutSession(userId, body.sessionId);

    return {
      success: true,
      data: result,
    };
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user subscription' })
  async getCurrentSubscription(@CurrentUser('id') userId: string) {
    const subscription = await this.subscriptionsService.getUserSubscription(userId);

    // Job seekers don't have subscriptions
    if (!subscription) {
      return {
        success: true,
        message: 'Job seekers do not need subscriptions - they can apply to jobs for free',
        data: null,
      };
    }

    // Transform the data to match frontend expectations
    const transformedData = {
      _id: subscription._id,
      plan: subscription.plan,
      status: subscription.status,
      startDate: subscription.currentPeriodStart?.toISOString() || (subscription as any).createdAt?.toISOString() || new Date().toISOString(),
      endDate: subscription.currentPeriodEnd?.toISOString(),
      cancelAtPeriodEnd: !subscription.autoRenew,
      boostsAvailable: subscription.boostsAvailable || 0,
      boostsUsed: subscription.boostsUsed || 0,
      featuredJobsEnabled: subscription.featuredJobsEnabled || false,
      advancedAnalyticsEnabled: subscription.advancedAnalyticsEnabled || false,
      prioritySupportEnabled: subscription.prioritySupportEnabled || false,
      // Enhanced Employer Features
      priorityApplicationsEnabled: subscription.priorityApplicationsEnabled || false,
      enhancedMatchingEnabled: subscription.enhancedMatchingEnabled || false,
      applicationAnalyticsEnabled: subscription.applicationAnalyticsEnabled || false,
      unlimitedResumeDownloads: subscription.unlimitedResumeDownloads || false,
      directMessagingEnabled: subscription.directMessagingEnabled || false,
      featuredProfileEnabled: subscription.featuredProfileEnabled || false,
      salaryInsightsEnabled: subscription.salaryInsightsEnabled || false,
      interviewPrepEnabled: subscription.interviewPrepEnabled || false,
      // API Access Features
      apiAccessEnabled: subscription.apiAccessEnabled || false,
      maxApiKeys: subscription.maxApiKeys || 0,
      apiRateLimitPerHour: subscription.apiRateLimitPerHour || 0,
      // Custom Branding Features
      customBrandingEnabled: subscription.customBrandingEnabled || false,
      whiteLabelEnabled: subscription.whiteLabelEnabled || false,
      // Bulk Operations
      bulkJobImportEnabled: subscription.bulkJobImportEnabled || false,
      maxBulkJobsPerImport: subscription.maxBulkJobsPerImport || 0,
      // Dedicated Account Manager
      dedicatedAccountManagerEnabled: subscription.dedicatedAccountManagerEnabled || false,
    };

    return {
      success: true,
      data: transformedData,
    };
  }

  @Get('my-subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user subscription' })
  async getMySubscription(@CurrentUser('id') userId: string) {
    const subscription = await this.subscriptionsService.getUserSubscription(userId);

    return {
      success: true,
      data: subscription,
    };
  }

  @Get('limits')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription limits and usage' })
  async getSubscriptionLimits(@CurrentUser('id') userId: string) {
    const limits = await this.subscriptionsService.getSubscriptionLimits(userId);

    return {
      success: true,
      data: limits,
    };
  }

  // User subscription cancellation removed - only admin can cancel subscriptions
  // Users need to contact admin for cancellation

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const signature = req.headers['stripe-signature'] as string;
    const payload = req.body as Buffer;

    try {
      

      await this.subscriptionsService.handleWebhook(signature, payload);
      res.json({ received: true });
    } catch (error) {
      console.error('❌ Webhook error:', error.message);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  }

  @Post('webhook/test')
  @HttpCode(200)
  @ApiOperation({ summary: 'Test webhook endpoint (for development)' })
  async testWebhook(@Body() body: any) {
   
    return { 
      success: true, 
      message: 'Test webhook endpoint working',
      received: body 
    };
  }

  @Post('boost/:jobId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Boost a job posting' })
  async boostJob(
    @CurrentUser('id') userId: string,
    @Param('jobId') jobId: string,
    @Body() body: { boostDays?: number },
  ) {
    const result = await this.jobBoostService.boostJob(userId, jobId, body.boostDays || 7);

    return {
      success: true,
      message: 'Job boosted successfully',
      data: result,
    };
  }

  @Post('boost/:jobId/remove')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove boost from job' })
  async removeBoost(
    @CurrentUser('id') userId: string,
    @Param('jobId') jobId: string,
  ) {
    const result = await this.jobBoostService.removeBoost(userId, jobId);

    return {
      success: true,
      message: 'Boost removed',
      data: result,
    };
  }

  @Get('boost-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get boost statistics' })
  async getBoostStatsAlt(@CurrentUser('id') userId: string) {
    const stats = await this.jobBoostService.getBoostStats(userId);

    return {
      success: true,
      data: stats,
    };
  }

  @Get('boost/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get boost statistics' })
  async getBoostStats(@CurrentUser('id') userId: string) {
    const stats = await this.jobBoostService.getBoostStats(userId);

    return {
      success: true,
      data: stats,
    };
  }

  @Get('boost/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get boosted jobs' })
  async getBoostedJobs(@CurrentUser('id') userId: string) {
    const jobs = await this.jobBoostService.getBoostedJobs(userId);

    return {
      success: true,
      data: jobs,
    };
  }
}

