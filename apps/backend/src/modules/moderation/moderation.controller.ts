import { Role, Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModerationService } from './moderation.service';
import { FlagStatus } from './schemas/content-flag.schema';

@ApiTags('Content Moderation')
@Controller('moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('flags')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get content flags with search, filter, and pagination' })
  async getFlags(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('type') type?: string
  ) {
    const result = await this.moderationService.getFlags(
      limit || 10,
      page || 1,
      search,
      status,
      priority,
      type
    );

    return {
      success: true,
      data: result,
    };
  }

  @Get('flags/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get content flag by ID' })
  async getFlagById(@Param('id') id: string) {
    const flag = await this.moderationService.getFlagById(id);

    return {
      success: true,
      data: flag,
    };
  }

  @Put('flags/:id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update flag status' })
  async updateFlagStatus(
    @Param('id') id: string,
    @Body() body: { status: FlagStatus; resolution?: string; reviewedBy: string }
  ) {
    const flag = await this.moderationService.updateFlagStatus(
      id,
      body.status,
      body.reviewedBy,
      body.resolution
    );

    return {
      success: true,
      message: 'Flag status updated successfully',
      data: flag,
    };
  }

  @Put('flags/:id/escalate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Escalate flag' })
  async escalateFlag(
    @Param('id') id: string,
    @Body() body: { escalatedTo: string; reason: string }
  ) {
    const flag = await this.moderationService.escalateFlag(
      id,
      body.escalatedTo,
      body.reason
    );

    return {
      success: true,
      message: 'Flag escalated successfully',
      data: flag,
    };
  }

  @Get('stats')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get moderation statistics' })
  async getStats() {
    const stats = await this.moderationService.getFlagStats();

    return {
      success: true,
      data: stats,
    };
  }
}
