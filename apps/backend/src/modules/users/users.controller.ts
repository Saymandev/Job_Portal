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
  @ApiOperation({ summary: 'Upload resume' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadResume(@CurrentUser('id') userId: string, @UploadedFile() file: Express.Multer.File) {
    console.log('Upload resume controller called with:', { userId, file: file ? { originalname: file.originalname, path: file.path, size: file.size } : null });
    
    if (!file) {
      console.log('No file provided');
      throw new BadRequestException('No file uploaded');
    }

    console.log('Calling usersService.uploadResume...');
    const result = await this.usersService.uploadResume(userId, file.path);
    console.log('Upload resume service result:', result);

    const response = {
      success: true,
      message: 'Resume uploaded successfully',
      data: result,
    };
    
    console.log('Returning response:', response);
    return response;
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
      console.log('CV endpoint called for user:', userId);
      
      // First, let's check the raw user data
      const rawUser = await this.usersService.findById(userId);
      console.log('Raw user data:', {
        id: rawUser._id,
        email: rawUser.email,
        resume: rawUser.resume,
        resumeFile: (rawUser as any).resumeFile,
        cvSkills: (rawUser as any).cvSkills,
        cvExperience: (rawUser as any).cvExperience,
        cvEducation: (rawUser as any).cvEducation,
      });
      
      const cvData = await this.usersService.getCV(userId);
      console.log('CV data retrieved successfully:', cvData);

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
    console.log(`Profile view tracking: candidateId=${id}, viewerId=${viewerId}`);
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

