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
  @ApiOperation({ summary: 'Create Stripe checkout session' })
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

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user subscription' })
  async getCurrentSubscription(@CurrentUser('id') userId: string) {
    const subscription = await this.subscriptionsService.getUserSubscription(userId);

    return {
      success: true,
      data: subscription,
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

  @Post('cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(@CurrentUser('id') userId: string) {
    const subscription = await this.subscriptionsService.cancelSubscription(userId);

    return {
      success: true,
      message: 'Subscription will be cancelled at the end of the current period',
      data: subscription,
    };
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const signature = req.headers['stripe-signature'] as string;
    const payload = req.body;

    try {
      await this.subscriptionsService.handleWebhook(signature, payload);
      res.json({ received: true });
    } catch (error) {
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
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

