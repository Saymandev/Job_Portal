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
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@ApiTags('Companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create company profile' })
  async create(@CurrentUser('id') userId: string, @Body() createCompanyDto: CreateCompanyDto) {
    const company = await this.companiesService.create(userId, createCompanyDto);

    return {
      success: true,
      message: 'Company created successfully',
      data: company,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all companies' })
  async findAll() {
    const companies = await this.companiesService.findAll();

    return {
      success: true,
      data: companies,
    };
  }

  @Get('my-company')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get employer company' })
  async getMyCompany(@CurrentUser('id') userId: string) {
    const company = await this.companiesService.findByOwner(userId);

    return {
      success: true,
      data: company,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  async findById(@Param('id') id: string) {
    const company = await this.companiesService.findById(id);

    return {
      success: true,
      data: company,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update company' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    const company = await this.companiesService.update(id, userId, updateCompanyDto);

    return {
      success: true,
      message: 'Company updated successfully',
      data: company,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete company' })
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    await this.companiesService.delete(id, userId);

    return {
      success: true,
      message: 'Company deleted successfully',
    };
  }

  @Post(':id/upload-logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload company logo' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const company = await this.companiesService.uploadLogo(id, userId, file.path);

    return {
      success: true,
      message: 'Logo uploaded successfully',
      data: company,
    };
  }
}

