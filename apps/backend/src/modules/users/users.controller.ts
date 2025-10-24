import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role, Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import {
  BadRequestException,
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
      console.log('🔍 [PRODUCTION DEBUG] Starting resume parsing for file:', file.originalname);
      console.log('🔍 [PRODUCTION DEBUG] File buffer size:', file.buffer?.length);
      console.log('🔍 [PRODUCTION DEBUG] File path:', file.path);
      console.log('🔍 [PRODUCTION DEBUG] File secureUrl:', (file as any).secureUrl);
      
      // In production, file.buffer might be undefined if file was uploaded to Cloudinary
      // We need to get the buffer from the Cloudinary URL
      let fileBuffer = file.buffer;
      if (!fileBuffer && file.path && file.path.includes('cloudinary.com')) {
        console.log('🌐 [PRODUCTION DEBUG] Downloading file from Cloudinary for parsing...');
        console.log('🌐 [PRODUCTION DEBUG] Cloudinary URL:', file.path);
        
        // With the updated upload config, PDFs should now be preserved as PDFs
        const urlExtension = file.path.split('.').pop()?.toLowerCase();
        console.log('🌐 [PRODUCTION DEBUG] URL extension:', urlExtension);
        
        if (urlExtension === 'pdf' || urlExtension === 'doc' || urlExtension === 'docx') {
          fileBuffer = await this.usersService.downloadFileFromUrl(file.path);
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
      // Continue with upload even if parsing fails
    }

    // In production with Cloudinary, file.path might be undefined
    // We need to handle both local storage and Cloudinary cases
    const filePath = file.path || (file as any).secureUrl || 'cloudinary-upload';
    const result = await this.usersService.uploadResume(userId, filePath, file.originalname, parsedData);

    const response = {
      success: true,
      message: result.parsedData ? 'Resume uploaded and profile updated successfully' : 'Resume uploaded successfully',
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

