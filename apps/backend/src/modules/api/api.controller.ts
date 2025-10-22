import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ApiService } from './api.service';

@ApiTags('External API')
@Controller('api/v1')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth()
export class ApiController {
  constructor(private readonly apiService: ApiService) {}

  // Jobs API
  @Get('jobs')
  @ApiOperation({ summary: 'Get jobs (API)' })
  async getJobs(@Request() req: any, @Query() query: any) {
    return this.apiService.getJobs(req.user.id, query);
  }

  @Post('jobs')
  @ApiOperation({ summary: 'Create job (API)' })
  async createJob(@Request() req: any, @Body() jobData: any) {
    return this.apiService.createJob(req.user.id, jobData);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get job by ID (API)' })
  async getJob(@Request() req: any, @Param('id') id: string) {
    return this.apiService.getJob(req.user.id, id);
  }

  @Put('jobs/:id')
  @ApiOperation({ summary: 'Update job (API)' })
  async updateJob(@Request() req: any, @Param('id') id: string, @Body() jobData: any) {
    return this.apiService.updateJob(req.user.id, id, jobData);
  }

  @Delete('jobs/:id')
  @ApiOperation({ summary: 'Delete job (API)' })
  async deleteJob(@Request() req: any, @Param('id') id: string) {
    return this.apiService.deleteJob(req.user.id, id);
  }

  // Applications API
  @Get('applications')
  @ApiOperation({ summary: 'Get applications (API)' })
  async getApplications(@Request() req: any, @Query() query: any) {
    return this.apiService.getApplications(req.user.id, query);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get application by ID (API)' })
  async getApplication(@Request() req: any, @Param('id') id: string) {
    return this.apiService.getApplication(req.user.id, id);
  }

  @Put('applications/:id/status')
  @ApiOperation({ summary: 'Update application status (API)' })
  async updateApplicationStatus(@Request() req: any, @Param('id') id: string, @Body() statusData: any) {
    return this.apiService.updateApplicationStatus(req.user.id, id, statusData);
  }

  // Company API
  @Get('company')
  @ApiOperation({ summary: 'Get company profile (API)' })
  async getCompany(@Request() req: any) {
    return this.apiService.getCompany(req.user.id);
  }

  @Put('company')
  @ApiOperation({ summary: 'Update company profile (API)' })
  async updateCompany(@Request() req: any, @Body() companyData: any) {
    return this.apiService.updateCompany(req.user.id, companyData);
  }

  // Analytics API
  @Get('analytics/jobs')
  @ApiOperation({ summary: 'Get job analytics (API)' })
  async getJobAnalytics(@Request() req: any, @Query() query: any) {
    return this.apiService.getJobAnalytics(req.user.id, query);
  }

  @Get('analytics/applications')
  @ApiOperation({ summary: 'Get application analytics (API)' })
  async getApplicationAnalytics(@Request() req: any, @Query() query: any) {
    return this.apiService.getApplicationAnalytics(req.user.id, query);
  }
}
