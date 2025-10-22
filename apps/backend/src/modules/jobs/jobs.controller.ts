import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';
import { Role, Roles } from '@/common/decorators/roles.decorator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { CsrfGuard } from '@/common/guards/csrf.guard';
import { CustomRateLimitGuard } from '@/common/guards/rate-limit.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateJobDto } from './dto/create-job.dto';
import { SearchJobsDto } from './dto/search-jobs.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { EnhancedMatchingService } from './enhanced-matching.service';
import { JobsService } from './jobs.service';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly enhancedMatchingService: EnhancedMatchingService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard, CustomRateLimitGuard)
  @Roles(Role.EMPLOYER)
  @RateLimit({ ttl: 60000, limit: 5 }) // 5 job posts per minute
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new job posting' })
  async create(
    @CurrentUser('id') userId: string, 
    @Body() createJobDto: CreateJobDto,
    @Req() req: Request
  ) {
    const result = await this.jobsService.create(userId, createJobDto, req);

    return {
      success: true,
      message: result.autoPosted 
        ? 'Job posted successfully and is now live!' 
        : 'Job created successfully and is pending approval',
      data: result.job,
      autoPosted: result.autoPosted,
      subscriptionInfo: result.subscriptionInfo,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Search and filter jobs' })
  async findAll(@Query() searchJobsDto: SearchJobsDto) {
    const result = await this.jobsService.findAll(searchJobsDto);

    return {
      success: true,
      ...result,
    };
  }

  @Get('employer/recent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent employer jobs with pagination' })
  async getRecentEmployerJobs(
    @CurrentUser('id') userId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    const result = await this.jobsService.findRecentByEmployerPaginated(
      userId,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );

    return {
      success: true,
      ...result,
    };
  }

  @Get('my-jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get employer jobs' })
  async getMyJobs(@CurrentUser('id') userId: string) {
    const jobs = await this.jobsService.findByEmployer(userId);

    return {
      success: true,
      data: jobs,
    };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get job statistics' })
  async getStats() {
    const stats = await this.jobsService.getStats();

    return {
      success: true,
      data: stats,
    };
  }

  @Post('recalculate-application-counts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Recalculate all job application counts' })
  async recalculateApplicationCounts() {
    await this.jobsService.recalculateAllApplicationCounts();

    return {
      success: true,
      message: 'Application counts recalculated successfully',
    };
  }

  // IMPORTANT: This route must be LAST to avoid conflicts with specific routes like /jobs/saved
  @Get(':id')
  @ApiOperation({ summary: 'Get job by ID' })
  async findById(@Param('id') id: string) {
    const job = await this.jobsService.findById(id);

    return {
      success: true,
      data: job,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update job' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() updateJobDto: UpdateJobDto,
  ) {
    const job = await this.jobsService.update(id, userId, updateJobDto);

    return {
      success: true,
      message: 'Job updated successfully',
      data: job,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete job' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.jobsService.delete(id, userId);

    return {
      success: true,
      message: 'Job deleted successfully',
    };
  }

  @Get(':id/enhanced-matches')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get enhanced candidate matches for job' })
  async getEnhancedMatches(
    @Param('id') jobId: string,
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string
  ) {
    const matches = await this.enhancedMatchingService.findBestCandidatesForJob(
      jobId,
      userId,
      limit ? parseInt(limit) : 10
    );

    return {
      success: true,
      data: matches,
    };
  }
}

