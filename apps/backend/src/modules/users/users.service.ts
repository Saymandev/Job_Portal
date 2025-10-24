import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { ResumeParserService } from '../resume-parser/resume-parser.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly resumeParserService: ResumeParserService,
  ) {}

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

  async uploadResume(userId: string, resumePath?: string, originalName?: string, parsedData?: any): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Handle case where resumePath is undefined or null
    if (!resumePath) {
      throw new BadRequestException('Resume file path is required');
    }

    // Extract filename from path
    // In production with Cloudinary, resumePath might be a URL or placeholder
    const filename = resumePath === 'cloudinary-upload' 
      ? originalName || 'resume' 
      : resumePath.split('/').pop() || resumePath.split('\\').pop() || 'resume';

    // Store resume file information
    // If using Cloudinary, resumePath will be the Cloudinary URL
    // If using local storage, resumePath will be the local file path
    const isCloudinaryUrl = resumePath.includes('cloudinary.com') || resumePath.includes('res.cloudinary.com');
    const isCloudinaryUpload = resumePath === 'cloudinary-upload';
    
    let resumeUrl: string;
    if (isCloudinaryUrl) {
      resumeUrl = resumePath; // Use Cloudinary URL directly
    } else if (isCloudinaryUpload) {
      // This shouldn't happen with the new upload config, but handle it gracefully
      resumeUrl = resumePath; // Use the actual Cloudinary URL from file.path
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

    // Use parsed data if provided, otherwise try to parse from local file
    // Note: In production with Cloudinary, we rely on parsedData from the controller
    if (!parsedData && !isCloudinaryUrl && !isCloudinaryUpload && originalName) {
      try {
        parsedData = await this.resumeParserService.parseResume(resumePath, originalName);
      } catch (error) {
        console.error('Error parsing resume from file:', error);
      }
    }

    // Update user profile with parsed data if available
    console.log('📝 [PRODUCTION DEBUG] Checking parsed data:', parsedData ? 'Available' : 'Not available');
    if (parsedData) {
      console.log('📋 [PRODUCTION DEBUG] Parsed data structure:', {
        hasPersonalInfo: !!parsedData.personalInfo,
        hasSkills: !!parsedData.skills,
        hasExperience: !!parsedData.experience,
        hasEducation: !!parsedData.education,
        skillsCount: parsedData.skills?.length || 0,
        experienceCount: parsedData.experience?.length || 0
      });
      if (parsedData.personalInfo) {
          // Only update fields that are empty or if the parsed data seems more complete
          if (!user.fullName && parsedData.personalInfo.fullName) {
            user.fullName = parsedData.personalInfo.fullName;
          }
          if (!(user as any).phone && parsedData.personalInfo.phone) {
            (user as any).phone = parsedData.personalInfo.phone;
          }
          if (!(user as any).location && parsedData.personalInfo.location) {
            (user as any).location = parsedData.personalInfo.location;
          }
          if (!(user as any).bio && parsedData.personalInfo.summary) {
            (user as any).bio = parsedData.personalInfo.summary;
          }
          if (!(user as any).professionalTitle && parsedData.personalInfo.professionalTitle) {
            (user as any).professionalTitle = parsedData.personalInfo.professionalTitle;
          }
          if (!(user as any).website && parsedData.additionalInfo?.website) {
            (user as any).website = parsedData.additionalInfo.website;
          }
          if (!(user as any).linkedinUrl && parsedData.additionalInfo?.linkedinUrl) {
            (user as any).linkedinUrl = parsedData.additionalInfo.linkedinUrl;
          }
          if (!(user as any).githubUrl && parsedData.additionalInfo?.githubUrl) {
            (user as any).githubUrl = parsedData.additionalInfo.githubUrl;
          }
        }

        // Update skills if user doesn't have any
        if (!(user as any).cvSkills || (user as any).cvSkills.length === 0) {
          (user as any).cvSkills = parsedData.skills.map(skill => ({
            id: `skill-${Date.now()}-${Math.random()}`,
            name: skill,
            level: 'intermediate',
            category: this.categorizeSkill(skill),
          }));
        }

        // Update experience if user doesn't have any
        if (!(user as any).cvExperience || (user as any).cvExperience.length === 0) {
          (user as any).cvExperience = parsedData.experience.map(exp => ({
            id: `exp-${Date.now()}-${Math.random()}`,
            title: exp.title,
            company: exp.company,
            location: exp.location || '',
            startDate: exp.startDate || '',
            endDate: exp.endDate || '',
            current: exp.current,
            description: exp.description,
            achievements: exp.achievements || [],
          }));
        }

        // Update education if user doesn't have any
        if (!(user as any).cvEducation || (user as any).cvEducation.length === 0) {
          (user as any).cvEducation = parsedData.education.map(edu => ({
            id: `edu-${Date.now()}-${Math.random()}`,
            degree: edu.degree,
            institution: edu.institution,
            location: edu.location || '',
            startDate: edu.startDate || '',
            endDate: edu.endDate || '',
            current: edu.current,
            gpa: edu.gpa || '',
            description: edu.description || '',
          }));
        }

        // Update certifications if user doesn't have any
        if (!(user as any).certifications || (user as any).certifications.length === 0) {
          (user as any).certifications = parsedData.certifications.map(cert => ({
            id: `cert-${Date.now()}-${Math.random()}`,
            name: cert.name,
            issuer: cert.issuer,
            date: cert.date,
            expiryDate: cert.expiryDate || '',
            credentialId: cert.credentialId || '',
            url: '',
          }));
        }

        // Update projects if user doesn't have any
        if (!(user as any).projects || (user as any).projects.length === 0) {
          (user as any).projects = parsedData.projects?.map(project => ({
            id: `proj-${Date.now()}-${Math.random()}`,
            name: project.name,
            description: project.description,
            technologies: project.technologies || [],
            url: project.url || '',
            githubUrl: '',
            startDate: project.startDate || '',
            endDate: project.endDate || '',
          })) || [];
        }

        // Update languages if user doesn't have any
        if (!(user as any).languages || (user as any).languages.length === 0) {
          (user as any).languages = parsedData.languages.map(lang => ({
            id: `lang-${Date.now()}-${Math.random()}`,
            language: lang.language,
            proficiency: lang.proficiency,
          }));
        }
    }  // Close if (parsedData) block
    
    const savedUser = await user.save();

    const result = {
      filename: filename,
      url: resumeUrl,
      uploadedAt: new Date(),
      parsedData: parsedData, // Include parsed data in response
    };

    return result;
  }

  async parseResumeFromBuffer(buffer: Buffer, originalName: string): Promise<any> {
    try {
      // Parse the resume from buffer
      const parsedData = await this.resumeParserService.parseResumeFromBuffer(buffer, originalName);
      return parsedData;
    } catch (error) {
      throw new BadRequestException(`Failed to parse resume: ${error.message}`);
    }
  }

  async downloadFileFromUrl(url: string): Promise<Buffer> {
    try {
      const axios = require('axios');
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 second timeout
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error('Error downloading file from URL:', error);
      throw new BadRequestException(`Failed to download file from URL: ${error.message}`);
    }
  }

  async parseResumeAndSuggestProfile(userId: string, resumePath: string, originalName: string): Promise<any> {
    try {
      // Parse the resume
      const parsedData = await this.resumeParserService.parseResume(resumePath, originalName);
      
      // Convert parsed data to the format expected by the frontend
      const suggestedProfile = {
        personalInfo: {
          fullName: parsedData.personalInfo.fullName || '',
          email: parsedData.personalInfo.email || '',
          phone: parsedData.personalInfo.phone || '',
          location: parsedData.personalInfo.location || '',
          bio: parsedData.personalInfo.summary || '',
          professionalTitle: parsedData.personalInfo.professionalTitle || '',
          website: parsedData.additionalInfo?.website || '',
          linkedinUrl: parsedData.additionalInfo?.linkedinUrl || '',
          githubUrl: parsedData.additionalInfo?.githubUrl || '',
        },
        skills: parsedData.skills.map(skill => ({
          id: `skill-${Date.now()}-${Math.random()}`,
          name: skill,
          level: 'intermediate' as const,
          category: this.categorizeSkill(skill),
        })),
        experience: parsedData.experience.map(exp => ({
          id: `exp-${Date.now()}-${Math.random()}`,
          title: exp.title,
          company: exp.company,
          location: exp.location || '',
          startDate: exp.startDate || '',
          endDate: exp.endDate || '',
          current: exp.current,
          description: exp.description,
          achievements: exp.achievements || [],
        })),
        education: parsedData.education.map(edu => ({
          id: `edu-${Date.now()}-${Math.random()}`,
          degree: edu.degree,
          institution: edu.institution,
          location: edu.location || '',
          startDate: edu.startDate || '',
          endDate: edu.endDate || '',
          current: edu.current,
          gpa: edu.gpa || '',
          description: edu.description || '',
        })),
        certifications: parsedData.certifications.map(cert => ({
          id: `cert-${Date.now()}-${Math.random()}`,
          name: cert.name,
          issuer: cert.issuer,
          date: cert.date,
          expiryDate: cert.expiryDate || '',
          credentialId: cert.credentialId || '',
          url: '',
        })),
        projects: parsedData.projects?.map(project => ({
          id: `proj-${Date.now()}-${Math.random()}`,
          name: project.name,
          description: project.description,
          technologies: project.technologies || [],
          url: project.url || '',
          githubUrl: '',
          startDate: project.startDate || '',
          endDate: project.endDate || '',
        })) || [],
        languages: parsedData.languages.map(lang => ({
          id: `lang-${Date.now()}-${Math.random()}`,
          language: lang.language,
          proficiency: lang.proficiency,
        })),
      };

      return {
        success: true,
        message: 'Resume parsed successfully',
        data: {
          suggestedProfile,
          originalParsedData: parsedData, // Include original parsed data for debugging
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to parse resume: ${error.message}`);
    }
  }

  private categorizeSkill(skill: string): string {
    const skillLower = skill.toLowerCase();
    
    // Technical skills
    if (skillLower.includes('javascript') || skillLower.includes('python') || skillLower.includes('java') || 
        skillLower.includes('react') || skillLower.includes('node') || skillLower.includes('sql') ||
        skillLower.includes('html') || skillLower.includes('css') || skillLower.includes('git')) {
      return 'Technical';
    }
    
    // Business skills
    if (skillLower.includes('management') || skillLower.includes('leadership') || 
        skillLower.includes('project') || skillLower.includes('strategy') ||
        skillLower.includes('analysis') || skillLower.includes('planning')) {
      return 'Business';
    }
    
    // Soft skills
    if (skillLower.includes('communication') || skillLower.includes('teamwork') ||
        skillLower.includes('problem') || skillLower.includes('creative') ||
        skillLower.includes('adaptable') || skillLower.includes('time management')) {
      return 'Soft Skills';
    }
    
    // Industry specific
    if (skillLower.includes('healthcare') || skillLower.includes('finance') ||
        skillLower.includes('education') || skillLower.includes('manufacturing') ||
        skillLower.includes('retail') || skillLower.includes('hospitality')) {
      return 'Industry Specific';
    }
    
    return 'Other';
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

