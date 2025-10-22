import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role, Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Body, Controller, Delete, Get, NotFoundException, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BrandingService } from './branding.service';
import { CreateBrandingDto } from './dto/create-branding.dto';

@ApiTags('Branding')
@Controller('branding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.EMPLOYER)
@ApiBearerAuth()
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  @Get()
  @ApiOperation({ summary: 'Get company branding' })
  async getBranding(@CurrentUser('id') userId: string) {
    const branding = await this.brandingService.getBranding(userId);

    return {
      success: true,
      data: branding,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create or update company branding' })
  async createOrUpdateBranding(
    @CurrentUser('id') userId: string,
    @Body() createBrandingDto: CreateBrandingDto,
  ) {
    const branding = await this.brandingService.createOrUpdateBranding(userId, createBrandingDto);

    return {
      success: true,
      message: 'Branding updated successfully',
      data: branding,
    };
  }

  @Put()
  @ApiOperation({ summary: 'Update company branding' })
  async updateBranding(
    @CurrentUser('id') userId: string,
    @Body() updateBrandingDto: CreateBrandingDto,
  ) {
    const branding = await this.brandingService.updateBranding(userId, updateBrandingDto);

    return {
      success: true,
      message: 'Branding updated successfully',
      data: branding,
    };
  }

  @Delete()
  @ApiOperation({ summary: 'Delete company branding' })
  async deleteBranding(@CurrentUser('id') userId: string) {
    await this.brandingService.deleteBranding(userId);

    return {
      success: true,
      message: 'Branding deleted successfully',
    };
  }

  @Post('activate')
  @ApiOperation({ summary: 'Activate branding' })
  async activateBranding(@CurrentUser('id') userId: string) {
    const branding = await this.brandingService.activateBranding(userId);

    return {
      success: true,
      message: 'Branding activated successfully',
      data: branding,
    };
  }

  @Post('deactivate')
  @ApiOperation({ summary: 'Deactivate branding' })
  async deactivateBranding(@CurrentUser('id') userId: string) {
    const branding = await this.brandingService.deactivateBranding(userId);

    return {
      success: true,
      message: 'Branding deactivated successfully',
      data: branding,
    };
  }

  @Get('css')
  @ApiOperation({ summary: 'Get branding CSS' })
  async getBrandingCss(@CurrentUser('id') userId: string) {
    const branding = await this.brandingService.getBranding(userId);
    
    if (!branding) {
      return {
        success: true,
        data: { css: '' },
      };
    }

    const css = await this.brandingService.generateBrandingCss(branding);

    return {
      success: true,
      data: { css },
    };
  }

  @Get('domain/check')
  @ApiOperation({ summary: 'Check domain availability' })
  async checkDomainAvailability(@Query('domain') domain: string) {
    if (!domain) {
      return {
        success: false,
        message: 'Domain is required',
      };
    }

    const isValid = await this.brandingService.validateCustomDomain(domain);
    if (!isValid) {
      return {
        success: false,
        message: 'Invalid domain format',
      };
    }

    const isAvailable = await this.brandingService.checkDomainAvailability(domain);

    return {
      success: true,
      data: { available: isAvailable },
    };
  }

  @Get('domain/:domain')
  @ApiOperation({ summary: 'Get branding by custom domain' })
  async getBrandingByDomain(@Query('domain') domain: string) {
    const branding = await this.brandingService.getBrandingByDomain(domain);

    if (!branding) {
      return {
        success: false,
        message: 'Branding not found for this domain',
      };
    }

    const css = await this.brandingService.generateBrandingCss(branding);

    return {
      success: true,
      data: { branding, css },
    };
  }

  @Get('white-label')
  @ApiOperation({ summary: 'Get white-label settings' })
  async getWhiteLabelSettings(@CurrentUser('id') userId: string) {
    const settings = await this.brandingService.getWhiteLabelSettings(userId);

    return {
      success: true,
      data: settings,
    };
  }

  @Put('white-label')
  @ApiOperation({ summary: 'Update white-label settings' })
  async updateWhiteLabelSettings(
    @CurrentUser('id') userId: string,
    @Body() settings: any,
  ) {
    const branding = await this.brandingService.updateWhiteLabelSettings(userId, settings);

    return {
      success: true,
      message: 'White-label settings updated successfully',
      data: branding,
    };
  }

  @Get('white-label/assets')
  @ApiOperation({ summary: 'Generate white-label assets' })
  async generateWhiteLabelAssets(@CurrentUser('id') userId: string) {
    const branding = await this.brandingService.getBranding(userId);
    if (!branding) {
      throw new NotFoundException('Branding not found');
    }

    const assets = await this.brandingService.generateWhiteLabelAssets(branding);

    return {
      success: true,
      data: assets,
    };
  }

  @Post('white-label/enable')
  @ApiOperation({ summary: 'Enable white-label features' })
  async enableWhiteLabel(
    @CurrentUser('id') userId: string,
    @Body() whiteLabelData: any,
  ) {
    const branding = await this.brandingService.enableWhiteLabel(userId, whiteLabelData);

    return {
      success: true,
      message: 'White-label features enabled successfully',
      data: branding,
    };
  }

  @Put('white-label/domain')
  @ApiOperation({ summary: 'Update custom domain' })
  async updateCustomDomain(
    @CurrentUser('id') userId: string,
    @Body('domain') domain: string,
  ) {
    const branding = await this.brandingService.updateCustomDomain(userId, domain);

    return {
      success: true,
      message: 'Custom domain updated successfully',
      data: branding,
    };
  }

  @Put('white-label/seo')
  @ApiOperation({ summary: 'Update SEO settings' })
  async updateSEOSettings(
    @CurrentUser('id') userId: string,
    @Body() seoSettings: any,
  ) {
    const branding = await this.brandingService.updateSEOSettings(userId, seoSettings);

    return {
      success: true,
      message: 'SEO settings updated successfully',
      data: branding,
    };
  }

  @Put('white-label/email-templates')
  @ApiOperation({ summary: 'Update email templates' })
  async updateEmailTemplates(
    @CurrentUser('id') userId: string,
    @Body() emailTemplates: any,
  ) {
    const branding = await this.brandingService.updateEmailTemplates(userId, emailTemplates);

    return {
      success: true,
      message: 'Email templates updated successfully',
      data: branding,
    };
  }

  @Put('white-label/legal-pages')
  @ApiOperation({ summary: 'Update legal pages' })
  async updateLegalPages(
    @CurrentUser('id') userId: string,
    @Body() legalPages: any,
  ) {
    const branding = await this.brandingService.updateLegalPages(userId, legalPages);

    return {
      success: true,
      message: 'Legal pages updated successfully',
      data: branding,
    };
  }
}
