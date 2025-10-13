import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role, Roles } from '@/common/decorators/roles.decorator';
import { PaginationDto } from '@/common/dto/pagination.dto';
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
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateJobDto } from './dto/create-job.dto';
import { SearchJobsDto } from './dto/search-jobs.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobsService } from './jobs.service';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new job posting' })
  async create(@CurrentUser('id') userId: string, @Body() createJobDto: CreateJobDto) {
    const job = await this.jobsService.create(userId, createJobDto);

    return {
      success: true,
      message: 'Job created successfully',
      data: job,
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
}

