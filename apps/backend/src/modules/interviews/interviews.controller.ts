import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role, Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
import { InterviewPrepService } from './interview-prep.service';
import { CreateTemplateDto, InterviewTemplateService, UpdateTemplateDto } from './interview-template.service';
import { InterviewsService } from './interviews.service';

export class UpdateInterviewStatusDto {
  status: string;
  feedback?: string;
  cancelReason?: string;
}

export class RescheduleInterviewDto {
  newDate: Date;
  notes?: string;
}

export class RequestRescheduleDto {
  @IsDateString()
  @IsNotEmpty()
  requestedNewDate: string;

  @IsString()
  @IsNotEmpty()
  rescheduleReason: string;
}

export class ApproveRescheduleDto {
  @IsNotEmpty()
  approved: boolean;

  @IsOptional()
  @IsDateString()
  newDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags('Interviews')
@Controller('interviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InterviewsController {
  constructor(
    private readonly interviewsService: InterviewsService,
    private readonly interviewPrepService: InterviewPrepService,
    private readonly interviewTemplateService: InterviewTemplateService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Schedule an interview' })
  async scheduleInterview(@Body() scheduleDto: ScheduleInterviewDto) {
    const interview = await this.interviewsService.scheduleInterview(scheduleDto);

    return {
      success: true,
      message: 'Interview scheduled successfully',
      data: interview,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get user interviews' })
  async getUserInterviews(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const interviews = await this.interviewsService.getUserInterviews(userId, role);

    return {
      success: true,
      data: interviews,
    };
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming interviews' })
  async getUpcomingInterviews(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    const interviews = await this.interviewsService.getUpcomingInterviews(userId, role);

    return {
      success: true,
      data: interviews,
    };
  }

  @Get('pending-reschedule-requests')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get pending reschedule requests for employer' })
  async getPendingRescheduleRequests(@CurrentUser('id') userId: string) {
    const interviews = await this.interviewsService.getPendingRescheduleRequests(userId);
    return {
      success: true,
      data: interviews,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get interview by ID' })
  async getInterviewById(@Param('id') id: string) {
    const interview = await this.interviewsService.getInterviewById(id);

    return {
      success: true,
      data: interview,
    };
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Update interview status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateInterviewStatusDto,
  ) {
    const interview = await this.interviewsService.updateInterviewStatus(
      id,
      updateDto.status,
      updateDto.feedback,
      updateDto.cancelReason,
    );

    return {
      success: true,
      message: 'Interview status updated',
      data: interview,
    };
  }

  @Put(':id/reschedule')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Reschedule interview' })
  async reschedule(
    @Param('id') id: string,
    @Body() rescheduleDto: RescheduleInterviewDto,
  ) {
    const interview = await this.interviewsService.rescheduleInterview(
      id,
      rescheduleDto.newDate,
      rescheduleDto.notes,
    );

    return {
      success: true,
      message: 'Interview rescheduled successfully',
      data: interview,
    };
  }

  @Post(':id/request-reschedule')
  @UseGuards(RolesGuard)
  @Roles(Role.JOB_SEEKER)
  @ApiOperation({ summary: 'Request interview reschedule (candidates only)' })
  async requestReschedule(
    @Param('id') id: string,
    @Body() requestDto: RequestRescheduleDto,
    @CurrentUser('id') userId: string,
  ) {
    
   
    
    const interview = await this.interviewsService.requestReschedule(
      id,
      requestDto.requestedNewDate,
      requestDto.rescheduleReason,
      userId,
    );

    return {
      success: true,
      message: 'Reschedule request submitted successfully',
      data: interview,
    };
  }

  @Put(':id/approve-reschedule')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Approve or reject reschedule request (employers only)' })
  async approveReschedule(
    @Param('id') id: string,
    @Body() approveDto: ApproveRescheduleDto,
    @CurrentUser('id') userId: string,
  ) {
    const interview = await this.interviewsService.approveReschedule(
      id,
      approveDto.approved,
      approveDto.newDate,
      approveDto.notes,
      userId,
    );

    return {
      success: true,
      message: approveDto.approved ? 'Reschedule request approved' : 'Reschedule request rejected',
      data: interview,
    };
  }

  // ========== INTERVIEW PREP ENDPOINTS ==========

  @Get('prep/questions')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get interview questions' })
  async getInterviewQuestions(@Query() query: any) {
    const questions = await this.interviewPrepService.getQuestions(query);

    return {
      success: true,
      data: questions,
    };
  }

  @Get('prep/templates')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get interview templates' })
  async getInterviewTemplates() {
    const templates = await this.interviewPrepService.getTemplates();

    return {
      success: true,
      data: templates,
    };
  }

  @Get('prep/sessions')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get interview sessions' })
  async getInterviewSessions(@CurrentUser('id') userId: string) {
    const sessions = await this.interviewPrepService.getSessions(userId);

    return {
      success: true,
      data: sessions,
    };
  }

  @Get('prep/tips')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get interview preparation tips' })
  async getInterviewTips(@Query() query: any) {
    const tips = await this.interviewPrepService.getTips(query);

    return {
      success: true,
      data: tips,
    };
  }

  // ========== INTERVIEW TEMPLATE ENDPOINTS ==========

  @Post('templates')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Create a new interview template' })
  async createTemplate(
    @Body() createTemplateDto: CreateTemplateDto,
    @CurrentUser('id') userId: string,
  ) {
    const template = await this.interviewTemplateService.createTemplate(createTemplateDto, userId);

    return {
      success: true,
      data: template,
    };
  }

  @Get('templates')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get interview templates with filtering' })
  async getTemplates(@Query() query: any) {
    const result = await this.interviewTemplateService.getTemplates(query);

    return {
      success: true,
      data: result,
    };
  }

  @Get('templates/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get a specific interview template' })
  async getTemplate(@Param('id') id: string) {
    const template = await this.interviewTemplateService.getTemplateById(id);

    return {
      success: true,
      data: template,
    };
  }

  @Put('templates/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Update an interview template' })
  async updateTemplate(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
    @CurrentUser('id') userId: string,
  ) {
    const template = await this.interviewTemplateService.updateTemplate(id, updateTemplateDto, userId);

    return {
      success: true,
      data: template,
    };
  }

  @Post('templates/:id/use')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Use an interview template' })
  async useTemplate(@Param('id') id: string) {
    const template = await this.interviewTemplateService.useTemplate(id);

    return {
      success: true,
      data: template,
      message: 'Template used successfully',
    };
  }

  @Post('templates/:id/rate')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Rate an interview template' })
  async rateTemplate(
    @Param('id') id: string,
    @Body() body: { rating: number },
  ) {
    const template = await this.interviewTemplateService.rateTemplate(id, body.rating);

    return {
      success: true,
      data: template,
      message: 'Template rated successfully',
    };
  }

  @Get('templates/popular')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get popular interview templates' })
  async getPopularTemplates(@Query('limit') limit?: number) {
    const templates = await this.interviewTemplateService.getPopularTemplates(limit);

    return {
      success: true,
      data: templates,
    };
  }

  @Get('templates/my')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get user\'s interview templates' })
  async getUserTemplates(@CurrentUser('id') userId: string) {
    const templates = await this.interviewTemplateService.getUserTemplates(userId);

    return {
      success: true,
      data: templates,
    };
  }

  @Post('templates/:id/duplicate')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Duplicate an interview template' })
  async duplicateTemplate(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const template = await this.interviewTemplateService.duplicateTemplate(id, userId);

    return {
      success: true,
      data: template,
      message: 'Template duplicated successfully',
    };
  }

  @Delete('templates/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Delete an interview template' })
  async deleteTemplate(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.interviewTemplateService.deleteTemplate(id, userId);

    return {
      success: true,
      message: 'Template deleted successfully',
    };
  }

  @Get('templates/stats')
  @UseGuards(RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get template statistics' })
  async getTemplateStats() {
    const stats = await this.interviewTemplateService.getTemplateStats();

    return {
      success: true,
      data: stats,
    };
  }
}
