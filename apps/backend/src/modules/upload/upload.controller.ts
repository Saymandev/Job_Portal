import {
    BadRequestException,
    Controller,
    ForbiddenException,
    HttpException,
    HttpStatus,
    Logger,
    Post,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { extname } from 'path';
import { AuditAction, AuditResource } from '../../common/schemas/audit-log.schema';
import { AuditService } from '../../common/services/audit.service';
import { FileScanResult, FileSecurityService } from '../../common/services/file-security.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadErrorDto, UploadResponseDto } from './dto/upload-response.dto';

interface SecureFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
  secureUrl?: string;
  scanResult?: FileScanResult;
}

@ApiTags('File Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(
    private readonly fileSecurityService: FileSecurityService,
    private readonly auditService: AuditService,
  ) {}

  @Post('secure')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload file with comprehensive security scanning' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'File uploaded successfully', type: UploadResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file', type: UploadErrorDto })
  @ApiResponse({ status: 403, description: 'Forbidden - file failed security scan', type: UploadErrorDto })
  @ApiBody({
    description: 'File to upload',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadSecureFile(
    @UploadedFile() file: SecureFile,
    @Req() req: Request,
  ): Promise<UploadResponseDto> {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      // Basic validation
      const fileExtension = extname(file.originalname).toLowerCase();
      
      if (!this.fileSecurityService.isAllowedExtension(fileExtension)) {
        await this.auditService.log(
          (req.user as any)?.id || null,
          AuditAction.CREATE_JOB, // Using CREATE_JOB as closest action
          AuditResource.JOB, // Using JOB as closest resource
          null,
          { 
            fileName: file.originalname,
            fileSize: file.size,
            reason: 'Invalid file extension'
          },
          req,
          false,
          'Invalid file extension'
        );
        
        throw new BadRequestException(
          `File type not allowed. Allowed types: PDF, DOC, DOCX, TXT, JPG, PNG, GIF, ZIP`
        );
      }

      if (!this.fileSecurityService.isFileSizeAllowed(file.size)) {
        await this.auditService.log(
          (req.user as any)?.id || null,
          AuditAction.CREATE_JOB,
          AuditResource.JOB,
          null,
          { 
            fileName: file.originalname,
            fileSize: file.size,
            reason: 'File size exceeded'
          },
          req,
          false,
          'File size exceeded'
        );
        
        throw new BadRequestException(
          `File size exceeds maximum allowed size (10MB)`
        );
      }

      // Sanitize filename
      const sanitizedFileName = this.fileSecurityService.sanitizeFileName(file.originalname);
      
      // Perform comprehensive security scan
      const filePath = file.path || file.buffer ? 'buffer' : 'cloudinary';
      let scanResult: FileScanResult;

      if (file.path) {
        // For disk storage
        scanResult = await this.fileSecurityService.scanFile(file.path, file.originalname);
      } else if (file.buffer) {
        // For memory storage (Cloudinary)
        const tempPath = `/tmp/${Date.now()}-${sanitizedFileName}`;
        require('fs').writeFileSync(tempPath, file.buffer);
        scanResult = await this.fileSecurityService.scanFile(tempPath, file.originalname);
        require('fs').unlinkSync(tempPath); // Clean up temp file
      } else {
        throw new BadRequestException('File processing error');
      }

      // Check scan results
      if (!scanResult.isSafe) {
        await this.auditService.log(
          (req.user as any)?.id || null,
          AuditAction.CREATE_JOB,
          AuditResource.JOB,
          null,
          { 
            fileName: file.originalname,
            fileSize: file.size,
            threats: scanResult.threats,
            reason: 'Security scan failed'
          },
          req,
          false,
          `Security threats detected: ${scanResult.threats.join(', ')}`
        );

        throw new ForbiddenException({
          message: 'File failed security scan',
          threats: scanResult.threats,
          scanDetails: scanResult.scanDetails
        });
      }

      // Log successful upload
      await this.auditService.log(
        (req.user as any)?.id || null,
        AuditAction.CREATE_JOB,
        AuditResource.JOB,
        null,
        { 
          fileName: sanitizedFileName,
          fileSize: file.size,
          fileType: scanResult.fileType,
          checksum: scanResult.checksum,
          scanDuration: scanResult.scanDetails.scanDuration
        },
        req,
        true
      );

      this.logger.log(`Secure file upload successful: ${sanitizedFileName} by user ${(req.user as any)?.id}`);

      return {
        success: true,
        message: 'File uploaded securely',
        data: {
          originalName: file.originalname,
          sanitizedName: sanitizedFileName,
          size: file.size,
          fileType: scanResult.fileType,
          checksum: scanResult.checksum,
          url: file.secureUrl || file.path,
          scanResult: {
            isSafe: scanResult.isSafe,
            scanDuration: scanResult.scanDetails.scanDuration,
            scannedAt: scanResult.scanDetails.scannedAt
          }
        }
      };

    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'File upload failed due to security scan error',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: 'Upload user avatar with security scanning' })
  @ApiConsumes('multipart/form-data')
  async uploadAvatar(
    @UploadedFile() file: SecureFile,
    @Req() req: Request,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('No avatar file uploaded');
      }

      // Avatar-specific validation
      const allowedImageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const fileExtension = extname(file.originalname).toLowerCase();
      
      if (!allowedImageTypes.includes(fileExtension)) {
        throw new BadRequestException('Avatar must be an image file (JPG, PNG, GIF, WebP)');
      }

      // Check file size (smaller limit for avatars)
      const maxAvatarSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxAvatarSize) {
        throw new BadRequestException('Avatar file size exceeds maximum allowed size (5MB)');
      }

      // Perform security scan
      let scanResult: FileScanResult;
      
      if (file.path) {
        scanResult = await this.fileSecurityService.scanFile(file.path, file.originalname);
      } else if (file.buffer) {
        const tempPath = `/tmp/${Date.now()}-avatar${fileExtension}`;
        require('fs').writeFileSync(tempPath, file.buffer);
        scanResult = await this.fileSecurityService.scanFile(tempPath, file.originalname);
        require('fs').unlinkSync(tempPath);
      }

      if (!scanResult.isSafe) {
        await this.auditService.log(
          (req.user as any)?.id || null,
          AuditAction.UPDATE_USER_PROFILE,
          AuditResource.USER,
          (req.user as any)?.id || null,
          { 
            fileName: file.originalname,
            threats: scanResult.threats,
            reason: 'Avatar security scan failed'
          },
          req,
          false,
          `Avatar security threats: ${scanResult.threats.join(', ')}`
        );

        throw new ForbiddenException({
          message: 'Avatar failed security scan',
          threats: scanResult.threats
        });
      }

      // Log successful avatar upload
      await this.auditService.log(
        (req.user as any)?.id || null,
        AuditAction.UPDATE_USER_PROFILE,
        AuditResource.USER,
        (req.user as any)?.id || null,
        { 
          fileName: file.originalname,
          fileSize: file.size,
          fileType: 'avatar'
        },
        req,
        true
      );

      return {
        success: true,
        message: 'Avatar uploaded securely',
        data: {
          originalName: file.originalname,
          size: file.size,
          url: file.secureUrl || file.path,
          scanResult: {
            isSafe: scanResult.isSafe,
            scanDuration: scanResult.scanDetails.scanDuration
          }
        }
      };

    } catch (error) {
      this.logger.error(`Avatar upload failed: ${error.message}`, error.stack);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Avatar upload failed due to security scan error',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
