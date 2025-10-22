import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).populate('company');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Ensure profileViews field exists (for existing users who might not have it)
    if (user.profileViews === undefined) {
      user.profileViews = 0;
      await user.save();
    }
    
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument> {
    return this.userModel.findOne({ email });
  }

  async findByRole(role: string): Promise<UserDocument[]> {
    return this.userModel.find({ role }).exec();
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updateProfileDto);
    await user.save();

    return user;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userModel.findById(userId).select('+password');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
  }

  async uploadResume(userId: string, resumePath?: string): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Handle case where resumePath is undefined or null
    if (!resumePath) {
      throw new BadRequestException('Resume file path is required');
    }

    // Extract filename from path
    const filename = resumePath.split('/').pop() || resumePath.split('\\').pop() || 'resume';

    // Store resume file information
    // If using Cloudinary, resumePath will be the Cloudinary URL
    // If using local storage, resumePath will be the local file path
    const isCloudinaryUrl = resumePath.includes('cloudinary.com') || resumePath.includes('res.cloudinary.com');
    
    let resumeUrl: string;
    if (isCloudinaryUrl) {
      resumeUrl = resumePath; // Use Cloudinary URL directly
    } else {
      resumeUrl = `uploads/${filename}`; // Local storage path
    }

    const resumeData = {
      filename: filename,
      url: resumeUrl,
      uploadedAt: new Date(),
    };
    
    (user as any).resumeFile = resumeData;
    
    // Also update the old resume field for backward compatibility
    user.resume = resumeUrl;
    
    const savedUser = await user.save();

    const result = {
      filename: filename,
      url: resumeUrl,
      uploadedAt: new Date(),
    };

    return result;
  }

  async uploadAvatar(userId: string, avatarPath: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.avatar = avatarPath;
    await user.save();

    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete
    user.isActive = false;
    await user.save();
  }

  async getAllUsers(filters?: any) {
    const query: any = {};

    if (filters?.role) {
      query.role = filters.role;
    }

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    return this.userModel.find(query).populate('company').select('-password');
  }

  async getCV(userId: string): Promise<any> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      // Return CV data structure
      const cvData = {
        personalInfo: {
          fullName: user.fullName || '',
          email: user.email || '',
          phone: (user as any).phone || '',
          location: (user as any).location || '',
          bio: (user as any).bio || '',
          professionalTitle: (user as any).professionalTitle || '',
          website: (user as any).website || '',
          linkedinUrl: (user as any).linkedinUrl || '',
          githubUrl: (user as any).githubUrl || '',
        },
        skills: (user as any).cvSkills || [],
        experience: (user as any).cvExperience || [],
        education: (user as any).cvEducation || [],
        certifications: (user as any).certifications || [],
        projects: (user as any).projects || [],
        languages: (user as any).languages || [],
        resume: (user as any).resumeFile ? {
          filename: (user as any).resumeFile.filename,
          url: (user as any).resumeFile.url,
          uploadedAt: (user as any).resumeFile.uploadedAt,
        } : (user as any).resume ? {
          filename: (user as any).resume.split('/').pop() || 'resume',
          url: (user as any).resume,
          uploadedAt: new Date(), // Default date if not available
        } : undefined,
      };

      return cvData;
    } catch (error) {
      console.error('Error in getCV:', error);
      throw error;
    }
  }

  async updateCV(userId: string, cvData: any): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user with CV data
    if (cvData.personalInfo) {
      user.fullName = cvData.personalInfo.fullName || user.fullName;
      user.email = cvData.personalInfo.email || user.email;
      (user as any).phone = cvData.personalInfo.phone;
      (user as any).location = cvData.personalInfo.location;
      (user as any).bio = cvData.personalInfo.bio;
      (user as any).professionalTitle = cvData.personalInfo.professionalTitle;
      (user as any).website = cvData.personalInfo.website;
      (user as any).linkedinUrl = cvData.personalInfo.linkedinUrl;
      (user as any).githubUrl = cvData.personalInfo.githubUrl;
    }

    (user as any).cvSkills = cvData.skills || [];
    (user as any).cvExperience = cvData.experience || [];
    (user as any).cvEducation = cvData.education || [];
    (user as any).certifications = cvData.certifications || [];
    (user as any).projects = cvData.projects || [];
    (user as any).languages = cvData.languages || [];

    await user.save();

    return this.getCV(userId);
  }

  async incrementProfileViews(profileId: string, viewerId: string): Promise<void> {
    const viewer = await this.userModel.findById(viewerId);
    if (!viewer) {
      return;
    }

    const result = await this.userModel.findByIdAndUpdate(
      profileId,
      {
        $inc: { profileViews: 1 },
        $push: {
          profileViewers: {
            viewerId,
            viewedAt: new Date(),
            viewerRole: viewer.role,
          },
        },
      },
      { upsert: false }
    );

    // Profile views incremented
  }

}

