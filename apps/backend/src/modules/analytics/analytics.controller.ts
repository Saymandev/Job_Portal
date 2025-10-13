import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role, Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

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
}
