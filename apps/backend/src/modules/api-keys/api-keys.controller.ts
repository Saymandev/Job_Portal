import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role, Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

@ApiTags('API Keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.EMPLOYER)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  async createApiKey(
    @CurrentUser('id') userId: string,
    @Body() createApiKeyDto: CreateApiKeyDto,
  ) {
    const result = await this.apiKeysService.createApiKey(
      userId,
      createApiKeyDto.name,
      createApiKeyDto.permissions,
    );

    return {
      success: true,
      message: 'API key created successfully',
      data: result,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all API keys for the user' })
  async getApiKeys(@CurrentUser('id') userId: string) {
    const apiKeys = await this.apiKeysService.getApiKeys(userId);

    return {
      success: true,
      data: apiKeys,
    };
  }

  @Put(':keyId')
  @ApiOperation({ summary: 'Update an API key' })
  async updateApiKey(
    @CurrentUser('id') userId: string,
    @Param('keyId') keyId: string,
    @Body() updateApiKeyDto: UpdateApiKeyDto,
  ) {
    const apiKey = await this.apiKeysService.updateApiKey(userId, keyId, updateApiKeyDto);

    return {
      success: true,
      message: 'API key updated successfully',
      data: apiKey,
    };
  }

  @Delete(':keyId')
  @ApiOperation({ summary: 'Revoke an API key' })
  async revokeApiKey(
    @CurrentUser('id') userId: string,
    @Param('keyId') keyId: string,
  ) {
    await this.apiKeysService.revokeApiKey(userId, keyId);

    return {
      success: true,
      message: 'API key revoked successfully',
    };
  }
}
