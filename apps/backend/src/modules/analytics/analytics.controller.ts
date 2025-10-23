import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role, Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { ApplicationAnalyticsService } from './application-analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly applicationAnalyticsService: ApplicationAnalyticsService
  ) {}

  @Get('employer')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get employer analytics' })
  async getEmployerAnalytics(@CurrentUser('id') userId: string) {
    const analytics = await this.analyticsService.getEmployerAnalytics(userId);

    return {
      success: true,
      data: analytics,
    };
  }

  @Get('job/:jobId')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get specific job analytics' })
  async getJobAnalytics(@Param('jobId') jobId: string) {
    const analytics = await this.analyticsService.getJobAnalytics(jobId);

    return {
      success: true,
      data: analytics,
    };
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get admin platform analytics' })
  async getAdminAnalytics() {
    const analytics = await this.analyticsService.getAdminAnalytics();

    return {
      success: true,
      data: analytics,
    };
  }

  @Get('job-seeker')
  @UseGuards(RolesGuard)
  @Roles(Role.JOB_SEEKER)
  @ApiOperation({ summary: 'Get job seeker analytics' })
  async getJobSeekerAnalytics(@CurrentUser('id') userId: string) {
    const analytics = await this.analyticsService.getJobSeekerAnalytics(userId);

    return {
      success: true,
      data: analytics,
    };
  }

  @Get('applications')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get application analytics' })
  async getApplicationAnalytics(@CurrentUser('id') userId: string, @Query() query: any) {
    const analytics = await this.applicationAnalyticsService.getApplicationAnalytics(userId, query.timeRange || '30d');

    return {
      success: true,
      data: analytics,
    };
  }

  @Get('salary-insights')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get salary insights and market data' })
  async getSalaryInsights(@Query() query: any) {
    const insights = await this.analyticsService.getSalaryInsights(query);

    return {
      success: true,
      data: insights,
    };
  }

  @Get('market-analysis')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get market analysis data' })
  async getMarketAnalysis() {
    const analysis = await this.analyticsService.getMarketAnalysis();

    return {
      success: true,
      data: analysis,
    };
  }
}
