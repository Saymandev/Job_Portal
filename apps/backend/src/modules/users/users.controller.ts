import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role, Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user data' })
  async getCurrentUser(@CurrentUser('id') userId: string) {
    const user = await this.usersService.findById(userId);

    return {
      success: true,
      data: user,
    };
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    const user = await this.usersService.findById(userId);

    return {
      success: true,
      data: user,
    };
  }

  // Resume Templates
  @Get('cv-templates')
  @ApiOperation({ summary: 'List available resume templates' })
  async listResumeTemplates() {
    const templates = await this.usersService.listResumeTemplates();
    return { success: true, data: templates };
  }

  @Post('cv-templates/seed')
  @ApiOperation({ summary: 'Seed default resume templates (idempotent)' })
  async seedResumeTemplates() {
    const templates = await this.usersService.seedResumeTemplates();
    return { success: true, data: templates };
  }

  // Resume Versions CRUD
  @Get('cv-versions')
  @ApiOperation({ summary: 'List my resume versions' })
  async listResumeVersions(@CurrentUser('id') userId: string) {
    const versions = await this.usersService.listResumeVersions(userId);
    return { success: true, data: versions };
  }

  @Get('cv-versions/:id')
  @ApiOperation({ summary: 'Get a specific resume version' })
  async getResumeVersion(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const version = await this.usersService.getResumeVersion(userId, id);
    return { success: true, data: version };
  }

  @Post('cv-versions')
  @ApiOperation({ summary: 'Create a new resume version' })
  async createResumeVersion(
    @CurrentUser('id') userId: string,
    @Body()
    payload: {
      name: string;
      templateId: string;
      theme?: string;
      sections?: Record<string, any>;
      isDefault?: boolean;
    },
  ) {
    const version = await this.usersService.createResumeVersion(userId, payload);
    return { success: true, data: version };
  }

  @Put('cv-versions/:id')
  @ApiOperation({ summary: 'Update a resume version' })
  async updateResumeVersion(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() payload: Partial<{ name: string; templateId: string; theme: string; sections: Record<string, any>; isDefault: boolean }>,
  ) {
    const version = await this.usersService.updateResumeVersion(userId, id, payload);
    return { success: true, data: version };
  }

  @Delete('cv-versions/:id')
  @ApiOperation({ summary: 'Delete a resume version' })
  async deleteResumeVersion(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    await this.usersService.deleteResumeVersion(userId, id);
    return { success: true, message: 'Deleted' };
  }

  @Get('cv-versions/:id/export')
  @ApiOperation({ summary: 'Export resume version as HTML (print to PDF in browser)' })
  @Header('Content-Type', 'text/html')
  async exportResumeVersionHtml(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const html = await this.usersService.renderResumeHtml(userId, id);
    return html;
  }

  @Post('ats-score')
  @ApiOperation({ summary: 'Compute ATS keyword match score for a job description' })
  async atsScore(
    @CurrentUser('id') userId: string,
    @Body() body: { versionId?: string; jobDescription: string },
  ) {
    if (!body?.jobDescription || typeof body.jobDescription !== 'string') {
      throw new BadRequestException('jobDescription is required');
    }
    const result = await this.usersService.computeAtsScore(userId, body.versionId, body.jobDescription);
    return { success: true, data: result };
  }

  @Post('ai-assist')
  @ApiOperation({ summary: 'AI assist (rewrite bullets or extract skills).' })
  async aiAssist(
    @Body() body: { mode: 'rewrite' | 'extract_skills'; text: string },
  ) {
    if (!body?.text || !body?.mode) {
      throw new BadRequestException('mode and text are required');
    }
    const result = await this.usersService.aiAssist(body.mode, body.text);
    return { success: true, data: result };
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(userId, updateProfileDto);

    return {
      success: true,
      message: 'Profile updated successfully',
      data: user,
    };
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change password' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  @Post('upload-resume')
  @ApiOperation({ summary: 'Upload resume and automatically parse profile data' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadResume(@CurrentUser('id') userId: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Parse resume from buffer before uploading to get the data
    let parsedData = null;
    try {
    
      
      
      // In production, file.buffer might be undefined if file was uploaded to Cloudinary
      // We need to get the buffer from the Cloudinary URL
      let fileBuffer = file.buffer;
      if (!fileBuffer && file.path && file.path.includes('cloudinary.com')) {
       
        
        
        // With the updated upload config, PDFs should now be preserved as PDFs
        const urlExtension = file.path.split('.').pop()?.toLowerCase();
        
        
        if (urlExtension === 'pdf' || urlExtension === 'doc' || urlExtension === 'docx') {
          try {
            fileBuffer = await this.usersService.downloadFileFromUrl(file.path);
            console.log('✅ [PRODUCTION DEBUG] Successfully downloaded file from Cloudinary');
          } catch (downloadError) {
            console.log('⚠️ [PRODUCTION DEBUG] Failed to download from Cloudinary:', downloadError.message);
            console.log('📝 [PRODUCTION DEBUG] Will skip parsing but continue with upload');
            
            // Log specific instructions for fixing this
            if (downloadError.message?.includes('401') || downloadError.message?.includes('access denied')) {
              console.log('🔧 [CLOUDINARY FIX] To enable PDF parsing, please:');
              console.log('   1. Go to Cloudinary Dashboard > Settings > Security');
              console.log('   2. Enable "Allow delivery of PDF and ZIP files"');
              console.log('   3. Save the settings');
              console.log('   4. Re-upload the resume to enable automatic parsing');
            }
            // Don't throw error, just skip parsing
          }
        } else {
          console.log('⚠️ [PRODUCTION DEBUG] File extension not supported for parsing:', urlExtension);
        }
      }
      
      if (fileBuffer) {
        parsedData = await this.usersService.parseResumeFromBuffer(fileBuffer, file.originalname);
        console.log('✅ [PRODUCTION DEBUG] Resume parsing successful:', parsedData ? 'Data extracted' : 'No data');
        if (parsedData) {
          console.log('📋 [PRODUCTION DEBUG] Parsed data keys:', Object.keys(parsedData));
        }
      } else {
        console.log('⚠️ [PRODUCTION DEBUG] No file buffer available for parsing');
      }
    } catch (error) {
      console.error('❌ [PRODUCTION DEBUG] Error parsing resume:', error);
      
      // If it's a 401 error, the file might be private - we'll still upload but skip parsing
      if (error.message?.includes('401') || error.message?.includes('access denied')) {
        console.log('🔒 [PRODUCTION DEBUG] File appears to be private, skipping parsing but continuing upload');
      } else {
        console.log('⚠️ [PRODUCTION DEBUG] Resume parsing failed, but continuing with upload');
      }
      // Continue with upload even if parsing fails
    }

    // In production with Cloudinary, file.path might be undefined
    // We need to handle both local storage and Cloudinary cases
    const filePath = file.path || (file as any).secureUrl || 'cloudinary-upload';
    const result = await this.usersService.uploadResume(userId, filePath, file.originalname, parsedData);

    // Determine the appropriate success message
    let message = 'Resume uploaded successfully';
    if (result.parsedData) {
      message = 'Resume uploaded and profile updated successfully';
    } else if (file.path && file.path.includes('cloudinary.com')) {
      message = 'Resume uploaded successfully. Note: Automatic profile parsing is disabled due to Cloudinary security settings. To enable parsing, please contact support.';
    }

    const response = {
      success: true,
      message: message,
      data: result,
    };
    
    return response;
  }

  @Post('parse-resume')
  @ApiOperation({ summary: 'Parse resume and suggest profile data' })
  @UseInterceptors(FileInterceptor('file'))
  async parseResume(@CurrentUser('id') userId: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.usersService.parseResumeAndSuggestProfile(userId, file.path, file.originalname);

    return result;
  }

  @Post('upload-avatar')
  @ApiOperation({ summary: 'Upload avatar' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@CurrentUser('id') userId: string, @UploadedFile() file: Express.Multer.File) {
    const user = await this.usersService.uploadAvatar(userId, file.path);

    return {
      success: true,
      message: 'Avatar uploaded successfully',
      data: user,
    };
  }

  @Get('cv')
  @ApiOperation({ summary: 'Get user CV data' })
  async getCV(@CurrentUser('id') userId: string) {
    try {
      
      
      // First, let's check the raw user data
      const rawUser = await this.usersService.findById(userId);
    
      
      const cvData = await this.usersService.getCV(userId);
      

      return {
        success: true,
        data: cvData,
      };
    } catch (error) {
      console.error('Error in getCV controller:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Track profile view' })
  async trackProfileView(@Param('id') id: string, @CurrentUser('id') viewerId: string) {
  
    await this.usersService.incrementProfileViews(id, viewerId);

    return {
      success: true,
      message: 'Profile view tracked',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUserById(@Param('id') id: string, @CurrentUser('id') viewerId: string) {
    const user = await this.usersService.findById(id);

    // Track profile view if viewer is different from profile owner
    if (viewerId && viewerId !== id) {
      await this.usersService.incrementProfileViews(id, viewerId);
    }

    return {
      success: true,
      data: user,
    };
  }

  @Delete('account')
  @ApiOperation({ summary: 'Delete user account' })
  async deleteAccount(@CurrentUser('id') userId: string) {
    await this.usersService.deleteUser(userId);

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  }

  @Put('cv')
  @ApiOperation({ summary: 'Update user CV data' })
  async updateCV(
    @CurrentUser('id') userId: string,
    @Body() cvData: any,
  ) {
    const updatedCV = await this.usersService.updateCV(userId, cvData);

    return {
      success: true,
      message: 'CV updated successfully',
      data: updatedCV,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  async deleteUser(@Param('id') userId: string) {
    await this.usersService.deleteUser(userId);

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }
}

