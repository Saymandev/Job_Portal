import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role, Roles } from '@/common/decorators/roles.decorator';
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
    UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SavedJobsService } from './saved-jobs.service';

export class SaveJobDto {
  @ApiProperty({ description: 'The ID of the job to save' })
  @IsString()
  jobId: string;

  @ApiPropertyOptional({ type: [String], description: 'Optional tags for the saved job' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Optional notes for the saved job' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSavedJobDto {
  @ApiPropertyOptional({ type: [String], description: 'Optional tags for the saved job' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Optional notes for the saved job' })
  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags('Saved Jobs')
@Controller('saved-jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.JOB_SEEKER)
@ApiBearerAuth()
export class SavedJobsController {
  constructor(private readonly savedJobsService: SavedJobsService) {}

  @Post()
  @ApiOperation({ summary: 'Save a job' })
  async saveJob(
    @CurrentUser('id') userId: string,
    @Body() saveJobDto: SaveJobDto,
  ) {
    const savedJob = await this.savedJobsService.saveJob(
      userId,
      saveJobDto.jobId,
      saveJobDto.tags,
      saveJobDto.notes,
    );

    return {
      success: true,
      message: 'Job saved successfully',
      data: savedJob,
    };
  }

  @Delete(':jobId')
  @ApiOperation({ summary: 'Unsave a job' })
  async unsaveJob(
    @CurrentUser('id') userId: string,
    @Param('jobId') jobId: string,
  ) {
    await this.savedJobsService.unsaveJob(userId, jobId);

    return {
      success: true,
      message: 'Job unsaved successfully',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get user saved jobs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSavedJobs(
    @CurrentUser('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const result = await this.savedJobsService.getSavedJobs(userId, page, limit);

    return {
      success: true,
      data: result.data,
      meta: result.meta,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get saved jobs statistics' })
  async getSavedJobStats(@CurrentUser('id') userId: string) {
    const stats = await this.savedJobsService.getSavedJobStats(userId);

    return {
      success: true,
      data: stats,
    };
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get job recommendations based on saved jobs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecommendations(
    @CurrentUser('id') userId: string,
    @Query('limit') limit: number = 10,
  ) {
    const recommendations = await this.savedJobsService.getRecommendationsBasedOnSavedJobs(userId, limit);

    return {
      success: true,
      data: recommendations,
    };
  }

  @Get(':savedJobId')
  @ApiOperation({ summary: 'Get saved job details' })
  async getSavedJobById(
    @CurrentUser('id') userId: string,
    @Param('savedJobId') savedJobId: string,
  ) {
    const savedJob = await this.savedJobsService.getSavedJobById(userId, savedJobId);

    return {
      success: true,
      data: savedJob,
    };
  }

  @Put(':savedJobId')
  @ApiOperation({ summary: 'Update saved job (tags, notes)' })
  async updateSavedJob(
    @CurrentUser('id') userId: string,
    @Param('savedJobId') savedJobId: string,
    @Body() updateDto: UpdateSavedJobDto,
  ) {
    const savedJob = await this.savedJobsService.updateSavedJob(
      userId,
      savedJobId,
      updateDto.tags,
      updateDto.notes,
    );

    return {
      success: true,
      message: 'Saved job updated successfully',
      data: savedJob,
    };
  }

  @Get('check/:jobId')
  @ApiOperation({ summary: 'Check if a job is saved by user' })
  async isJobSaved(
    @CurrentUser('id') userId: string,
    @Param('jobId') jobId: string,
  ) {
    const isSaved = await this.savedJobsService.isJobSaved(userId, jobId);

    return {
      success: true,
      data: { isSaved },
    };
  }
}
