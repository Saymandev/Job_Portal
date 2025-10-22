import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role, Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';
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
  constructor(private readonly interviewsService: InterviewsService) {}

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
}
