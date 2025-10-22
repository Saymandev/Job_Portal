import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role, Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Controller, Delete, Get, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BulkImportService } from './bulk-import.service';

@ApiTags('Bulk Import')
@Controller('bulk-import')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.EMPLOYER)
@ApiBearerAuth()
export class BulkImportController {
  constructor(private readonly bulkImportService: BulkImportService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/bulk-import',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const ext = extname(file.originalname);
          cb(null, `bulk-import-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
          cb(null, true);
        } else {
          cb(new Error('Only CSV files are allowed'), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload CSV file for bulk job import' })
  async uploadCSV(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      return {
        success: false,
        message: 'No file uploaded',
      };
    }

    const bulkImport = await this.bulkImportService.createBulkImport(
      userId,
      file.filename,
      file.originalname,
      file.path,
    );

    // Process the import asynchronously
    this.bulkImportService.processBulkImport((bulkImport as any)._id.toString()).catch(console.error);

    return {
      success: true,
      message: 'File uploaded successfully. Processing started.',
      data: {
        importId: (bulkImport as any)._id.toString(),
        status: bulkImport.status,
        fileName: bulkImport.originalFileName,
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all bulk imports for the user' })
  async getBulkImports(@CurrentUser('id') userId: string) {
    const imports = await this.bulkImportService.getBulkImports(userId);

    return {
      success: true,
      data: imports,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specific bulk import details' })
  async getBulkImport(
    @CurrentUser('id') userId: string,
    @Param('id') importId: string,
  ) {
    const bulkImport = await this.bulkImportService.getBulkImport(userId, importId);

    return {
      success: true,
      data: bulkImport,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete bulk import and its file' })
  async deleteBulkImport(
    @CurrentUser('id') userId: string,
    @Param('id') importId: string,
  ) {
    await this.bulkImportService.deleteBulkImport(userId, importId);

    return {
      success: true,
      message: 'Bulk import deleted successfully',
    };
  }

  @Get('template/download')
  @ApiOperation({ summary: 'Download CSV template for bulk import' })
  async downloadTemplate(@Res() res: Response) {
    const template = await this.bulkImportService.getCSVTemplate();

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="job-import-template.csv"',
    });

    res.send(template);
  }
}
