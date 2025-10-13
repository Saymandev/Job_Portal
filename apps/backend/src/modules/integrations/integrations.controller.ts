import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IntegrationsService } from './integrations.service';
import { IntegrationType } from './schemas/integration.schema';

export class ConnectIntegrationDto {
  type: IntegrationType;
  credentials: any;
  settings?: any;
  companyId?: string;
}

export class UpdateIntegrationSettingsDto {
  settings: any;
}

@ApiTags('Integrations')
@Controller('integrations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user integrations' })
  async getUserIntegrations(@CurrentUser('id') userId: string) {
    const integrations = await this.integrationsService.getUserIntegrations(userId);

    return {
      success: true,
      data: integrations,
    };
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available integrations' })
  async getAvailableIntegrations() {
    const integrations = await this.integrationsService.getAvailableIntegrations();

    return {
      success: true,
      data: integrations,
    };
  }

  @Post('connect')
  @ApiOperation({ summary: 'Connect an integration' })
  async connectIntegration(
    @CurrentUser('id') userId: string,
    @Body() connectDto: ConnectIntegrationDto,
  ) {
    const integration = await this.integrationsService.connectIntegration(
      userId,
      connectDto.type,
      connectDto.credentials,
      connectDto.settings,
      connectDto.companyId,
    );

    return {
      success: true,
      message: 'Integration connected successfully',
      data: integration,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Disconnect an integration' })
  async disconnectIntegration(
    @CurrentUser('id') userId: string,
    @Param('id') integrationId: string,
  ) {
    await this.integrationsService.disconnectIntegration(userId, integrationId);

    return {
      success: true,
      message: 'Integration disconnected',
    };
  }

  @Put(':id/settings')
  @ApiOperation({ summary: 'Update integration settings' })
  async updateSettings(
    @CurrentUser('id') userId: string,
    @Param('id') integrationId: string,
    @Body() updateDto: UpdateIntegrationSettingsDto,
  ) {
    const integration = await this.integrationsService.updateIntegrationSettings(
      userId,
      integrationId,
      updateDto.settings,
    );

    return {
      success: true,
      message: 'Settings updated',
      data: integration,
    };
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Manually sync an integration' })
  async syncIntegration(
    @CurrentUser('id') userId: string,
    @Param('id') integrationId: string,
  ) {
    const result = await this.integrationsService.syncIntegration(userId, integrationId);

    return {
      success: true,
      message: 'Sync completed',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get integration details' })
  async getIntegrationById(
    @CurrentUser('id') userId: string,
    @Param('id') integrationId: string,
  ) {
    const integration = await this.integrationsService.getIntegrationById(userId, integrationId);

    return {
      success: true,
      data: integration,
    };
  }
}
