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
    Res,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

@ApiTags('Applications')
@Controller('applications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.JOB_SEEKER)
  @ApiOperation({ summary: 'Apply for a job' })
  async create(@CurrentUser('id') userId: string, @Body() createApplicationDto: CreateApplicationDto) {
    const application = await this.applicationsService.create(userId, createApplicationDto);

    return {
      success: true,
      message: 'Application submitted successfully',
      data: application,
    };
  }

  @Get('my-applications')
  @UseGuards(RolesGuard)
  @Roles(Role.JOB_SEEKER)
  @ApiOperation({ summary: 'Get user applications' })
  async getMyApplications(@CurrentUser('id') userId: string) {
    const applications = await this.applicationsService.findByApplicant(userId);

    return {
      success: true,
      data: applications,
    };
  }

  @Get('job/:jobId')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get applications for a job' })
  async getJobApplications(@Param('jobId') jobId: string, @CurrentUser('id') userId: string) {
    const applications = await this.applicationsService.findByJob(jobId, userId);

    return {
      success: true,
      data: applications,
    };
  }

  @Get('employer/recent')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get recent applications for employer with pagination' })
  async getRecentEmployerApplications(
    @CurrentUser('id') userId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    const result = await this.applicationsService.findRecentByEmployerPaginated(
      userId,
      paginationDto.page || 1,
      paginationDto.limit || 10,
    );

    return {
      success: true,
      ...result,
    };
  }

  @Get('employer')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get all applications for employer' })
  async getEmployerApplications(@CurrentUser('id') userId: string) {
    const applications = await this.applicationsService.findByEmployer(userId);

    return {
      success: true,
      data: applications,
    };
  }

  @Get('company/:companyId')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get all company applications' })
  async getCompanyApplications(@Param('companyId') companyId: string, @CurrentUser('id') userId: string) {
    const applications = await this.applicationsService.findByCompany(companyId, userId);

    return {
      success: true,
      data: applications,
    };
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @ApiOperation({ summary: 'Get application statistics' })
  async getStats(@Query('companyId') companyId?: string) {
    const stats = await this.applicationsService.getStats(companyId);

    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application by ID' })
  async findById(@Param('id') id: string) {
    const application = await this.applicationsService.findById(id);

    return {
      success: true,
      data: application,
    };
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Update application status' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() updateStatusDto: UpdateApplicationStatusDto,
  ) {
    const application = await this.applicationsService.updateStatus(id, userId, updateStatusDto);

    return {
      success: true,
      message: 'Application status updated',
      data: application,
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.JOB_SEEKER)
  @ApiOperation({ summary: 'Withdraw application' })
  async withdraw(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.applicationsService.withdraw(id, userId);

    return {
      success: true,
      message: 'Application withdrawn successfully',
    };
  }

  @Get(':id/download-resume')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Download candidate resume' })
  async downloadResume(
    @Param('id') applicationId: string,
    @CurrentUser('id') employerId: string,
    @Res() res: Response,
  ) {
    const resumeBuffer = await this.applicationsService.downloadResume(applicationId, employerId);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="resume.pdf"',
      'Content-Length': resumeBuffer.length.toString(),
    });
    
    res.send(resumeBuffer);
  }
}

