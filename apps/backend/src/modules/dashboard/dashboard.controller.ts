import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role, Roles } from '@/common/decorators/roles.decorator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ========== EMPLOYER ENDPOINTS ==========

  @Get('employer/stats')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get employer dashboard statistics' })
  async getEmployerStats(@CurrentUser('id') userId: string) {
    const stats = await this.dashboardService.getEmployerStats(userId);

    return {
      success: true,
      data: stats,
    };
  }

  @Get('employer/analytics')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get employer analytics data' })
  async getEmployerAnalytics(@CurrentUser('id') userId: string) {
    const analytics = await this.dashboardService.getEmployerAnalytics(userId);

    return {
      success: true,
      data: analytics,
    };
  }

  @Get('employer/recent-jobs')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get recent jobs posted by employer with pagination' })
  async getEmployerRecentJobs(
    @CurrentUser('id') userId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    const result = await this.dashboardService.getRecentJobs(
      userId,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );

    return {
      success: true,
      ...result,
    };
  }

  @Get('employer/recent-candidates')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get recent candidates who applied with pagination' })
  async getEmployerRecentCandidates(
    @CurrentUser('id') userId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    const result = await this.dashboardService.getRecentCandidates(
      userId,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );

    return {
      success: true,
      ...result,
    };
  }

  // ========== JOB SEEKER ENDPOINTS ==========

  @Get('job-seeker/stats')
  @UseGuards(RolesGuard)
  @Roles(Role.JOB_SEEKER)
  @ApiOperation({ summary: 'Get job seeker dashboard statistics' })
  async getJobSeekerStats(@CurrentUser('id') userId: string) {
    const stats = await this.dashboardService.getJobSeekerStats(userId);

    return {
      success: true,
      data: stats,
    };
  }
}

