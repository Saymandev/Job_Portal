import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdvancedAnalyticsService } from './advanced-analytics.service';

@ApiTags('Advanced Analytics')
@Controller('advanced-analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdvancedAnalyticsController {
  constructor(private readonly advancedAnalyticsService: AdvancedAnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get analytics dashboard overview' })
  async getAnalyticsDashboard(@CurrentUser('id') userId: string) {
    const dashboard = await this.advancedAnalyticsService.getAnalyticsDashboard(userId);

    return {
      success: true,
      data: dashboard,
    };
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate new analytics insights' })
  async generateInsights(
    @CurrentUser('id') userId: string,
    @Body() filters: any,
  ) {
    const insights = await this.advancedAnalyticsService.generateInsights(userId, filters);

    return {
      success: true,
      message: 'Analytics insights generated successfully',
      data: insights,
    };
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get analytics insights' })
  async getInsights(
    @CurrentUser('id') userId: string,
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('isRead') isRead?: boolean,
    @Query('limit') limit?: number,
  ) {
    const insights = await this.advancedAnalyticsService.getInsights(userId, {
      type,
      category,
      isRead,
      limit,
    });

    return {
      success: true,
      data: insights,
    };
  }

  @Get('insights/:id')
  @ApiOperation({ summary: 'Get specific analytics insight' })
  async getInsight(
    @CurrentUser('id') userId: string,
    @Param('id') insightId: string,
  ) {
    const insight = await this.advancedAnalyticsService.getInsight(userId, insightId);

    return {
      success: true,
      data: insight,
    };
  }

  @Put('insights/:id/read')
  @ApiOperation({ summary: 'Mark insight as read' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') insightId: string,
  ) {
    const insight = await this.advancedAnalyticsService.markAsRead(userId, insightId);

    return {
      success: true,
      message: 'Insight marked as read',
      data: insight,
    };
  }
}
