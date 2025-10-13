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
    UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CoverLetterTemplatesService } from './cover-letter-templates.service';

export class CreateCoverLetterTemplateDto {
  name: string;
  content: string;
  isDefault?: boolean;
  tags?: string[];
}

export class UpdateCoverLetterTemplateDto {
  name?: string;
  content?: string;
  isDefault?: boolean;
  tags?: string[];
}

export class GenerateCoverLetterDto {
  jobTitle: string;
  companyName: string;
  templateId?: string;
}

@ApiTags('Cover Letter Templates')
@Controller('cover-letter-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.JOB_SEEKER)
@ApiBearerAuth()
export class CoverLetterTemplatesController {
  constructor(private readonly coverLetterTemplatesService: CoverLetterTemplatesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new cover letter template' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createDto: CreateCoverLetterTemplateDto,
  ) {
    const template = await this.coverLetterTemplatesService.create(
      userId,
      createDto.name,
      createDto.content,
      createDto.isDefault,
      createDto.tags,
    );

    return {
      success: true,
      message: 'Template created successfully',
      data: template,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all cover letter templates' })
  async findAll(@CurrentUser('id') userId: string) {
    const templates = await this.coverLetterTemplatesService.findAll(userId);

    return {
      success: true,
      data: templates,
    };
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default cover letter template' })
  async findDefault(@CurrentUser('id') userId: string) {
    const template = await this.coverLetterTemplatesService.findDefault(userId);

    return {
      success: true,
      data: template,
    };
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate cover letter with placeholders' })
  async generate(
    @CurrentUser('id') userId: string,
    @Body() generateDto: GenerateCoverLetterDto,
  ) {
    let templateContent: string | undefined;

    if (generateDto.templateId) {
      const template = await this.coverLetterTemplatesService.findById(
        userId,
        generateDto.templateId,
      );
      templateContent = template.content;
    }

    const coverLetter = await this.coverLetterTemplatesService.generateTemplateWithPlaceholders(
      userId,
      generateDto.jobTitle,
      generateDto.companyName,
      templateContent,
    );

    return {
      success: true,
      data: { coverLetter },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cover letter template by ID' })
  async findOne(@CurrentUser('id') userId: string, @Param('id') templateId: string) {
    const template = await this.coverLetterTemplatesService.findById(userId, templateId);

    return {
      success: true,
      data: template,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update cover letter template' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') templateId: string,
    @Body() updateDto: UpdateCoverLetterTemplateDto,
  ) {
    const template = await this.coverLetterTemplatesService.update(
      userId,
      templateId,
      updateDto.name,
      updateDto.content,
      updateDto.isDefault,
      updateDto.tags,
    );

    return {
      success: true,
      message: 'Template updated successfully',
      data: template,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete cover letter template' })
  async delete(@CurrentUser('id') userId: string, @Param('id') templateId: string) {
    await this.coverLetterTemplatesService.delete(userId, templateId);

    return {
      success: true,
      message: 'Template deleted successfully',
    };
  }
}
