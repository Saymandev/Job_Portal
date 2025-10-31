import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { ResumeParserService } from '../resume-parser/resume-parser.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ResumeTemplate, ResumeTemplateDocument } from './schemas/resume-template.schema';
import { ResumeVersion, ResumeVersionDocument } from './schemas/resume-version.schema';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(ResumeTemplate.name) private templateModel: Model<ResumeTemplateDocument>,
    @InjectModel(ResumeVersion.name) private versionModel: Model<ResumeVersionDocument>,
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
          console.log('📝 [PROFILE UPDATE] Updating personal information...');
          
          // Always update personal information fields when we have parsed data
          if (parsedData.personalInfo.fullName) {
            console.log('📝 [PROFILE UPDATE] Updating fullName:', parsedData.personalInfo.fullName);
            user.fullName = parsedData.personalInfo.fullName;
          }
          if (parsedData.personalInfo.phone) {
            console.log('📝 [PROFILE UPDATE] Updating phone:', parsedData.personalInfo.phone);
            (user as any).phone = parsedData.personalInfo.phone;
          }
          if (parsedData.personalInfo.location) {
            console.log('📝 [PROFILE UPDATE] Updating location:', parsedData.personalInfo.location);
            (user as any).location = parsedData.personalInfo.location;
          }
          if (parsedData.personalInfo.summary) {
            console.log('📝 [PROFILE UPDATE] Updating bio/summary');
            (user as any).bio = parsedData.personalInfo.summary;
          }
          if (parsedData.personalInfo.professionalTitle) {
            console.log('📝 [PROFILE UPDATE] Updating professionalTitle:', parsedData.personalInfo.professionalTitle);
            (user as any).professionalTitle = parsedData.personalInfo.professionalTitle;
          }
        }

        // Update additional information (website, LinkedIn, GitHub)
        if (parsedData.additionalInfo) {
          console.log('📝 [PROFILE UPDATE] Updating additional information...');
          
          if (parsedData.additionalInfo.website) {
            console.log('📝 [PROFILE UPDATE] Updating website:', parsedData.additionalInfo.website);
            (user as any).website = parsedData.additionalInfo.website;
          }
          if (parsedData.additionalInfo.linkedinUrl) {
            console.log('📝 [PROFILE UPDATE] Updating linkedinUrl:', parsedData.additionalInfo.linkedinUrl);
            (user as any).linkedinUrl = parsedData.additionalInfo.linkedinUrl;
          }
          if (parsedData.additionalInfo.githubUrl) {
            console.log('📝 [PROFILE UPDATE] Updating githubUrl:', parsedData.additionalInfo.githubUrl);
            (user as any).githubUrl = parsedData.additionalInfo.githubUrl;
          }
        }

        // Update skills - always update if we have parsed skills
        if (parsedData.skills && parsedData.skills.length > 0) {
          console.log('📝 [PROFILE UPDATE] Updating skills:', parsedData.skills.length, 'skills');
          (user as any).cvSkills = parsedData.skills.map(skill => ({
            id: `skill-${Date.now()}-${Math.random()}`,
            name: skill,
            level: 'intermediate',
            category: this.categorizeSkill(skill),
          }));
        }

        // Update experience - always update if we have parsed experience
        if (parsedData.experience && parsedData.experience.length > 0) {
          console.log('📝 [PROFILE UPDATE] Updating experience:', parsedData.experience.length, 'entries');
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

        // Update education - always update if we have parsed education
        if (parsedData.education && parsedData.education.length > 0) {
          console.log('📝 [PROFILE UPDATE] Updating education:', parsedData.education.length, 'entries');
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

        // Update certifications - always update if we have parsed certifications
        if (parsedData.certifications && parsedData.certifications.length > 0) {
          console.log('📝 [PROFILE UPDATE] Updating certifications:', parsedData.certifications.length, 'entries');
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

        // Update projects - always update if we have parsed projects
        if (parsedData.projects && parsedData.projects.length > 0) {
          console.log('📝 [PROFILE UPDATE] Updating projects:', parsedData.projects.length, 'entries');
          (user as any).projects = parsedData.projects.map(project => ({
            id: `proj-${Date.now()}-${Math.random()}`,
            name: project.name,
            description: project.description,
            technologies: project.technologies || [],
            url: project.url || '',
            githubUrl: '',
            startDate: project.startDate || '',
            endDate: project.endDate || '',
          }));
        }

        // Update languages - always update if we have parsed languages
        if (parsedData.languages && parsedData.languages.length > 0) {
          console.log('📝 [PROFILE UPDATE] Updating languages:', parsedData.languages.length, 'entries');
          (user as any).languages = parsedData.languages.map(lang => ({
            id: `lang-${Date.now()}-${Math.random()}`,
            language: lang.language,
            proficiency: lang.proficiency,
          }));
        }
    }  // Close if (parsedData) block
    
    console.log('💾 [PROFILE UPDATE] Saving user profile with updated data...');
    const savedUser = await user.save();
    console.log('✅ [PROFILE UPDATE] User profile saved successfully');

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
      
      // Try different approaches for Cloudinary URLs
      let response;
      
      if (url.includes('cloudinary.com')) {
        // For Cloudinary URLs, try multiple strategies
        const strategies = [
          // Strategy 1: Try with attachment flag
          url.replace('/raw/upload/', '/raw/upload/fl_attachment/'),
          // Strategy 2: Try with public access flag
          url.replace('/raw/upload/', '/raw/upload/fl_public/'),
          // Strategy 3: Try with explicit public access
          url.replace('/raw/upload/', '/raw/upload/fl_public,fl_attachment/'),
          // Strategy 4: Try original URL
          url
        ];
        
        let lastError;
        for (const strategyUrl of strategies) {
          try {
            console.log(`🔄 [CLOUDINARY DEBUG] Trying strategy: ${strategyUrl}`);
            response = await axios.get(strategyUrl, {
              responseType: 'arraybuffer',
              timeout: 30000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/pdf,application/octet-stream,*/*',
                'Referer': 'https://job-portal.com', // Add referer to help with CORS
              },
            });
            console.log(`✅ [CLOUDINARY DEBUG] Success with strategy: ${strategyUrl}`);
            break; // Success, exit the loop
          } catch (strategyError) {
            console.log(`❌ [CLOUDINARY DEBUG] Strategy failed: ${strategyError.response?.status} - ${strategyUrl}`);
            lastError = strategyError;
            continue; // Try next strategy
          }
        }
        
        if (!response) {
          throw lastError || new Error('All Cloudinary strategies failed');
        }
      } else {
        // For other URLs, use standard request
        response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/pdf,application/octet-stream,*/*',
          },
        });
      }
      
      return Buffer.from(response.data);
    } catch (error) {
      console.error('Error downloading file from URL:', error);
      
      // Provide more specific error messages
      if (error.response?.status === 401) {
        throw new BadRequestException('File access denied. Please enable PDF delivery in Cloudinary security settings or the file may be private.');
      } else if (error.response?.status === 404) {
        throw new BadRequestException('File not found. The file may have been deleted or moved.');
      } else if (error.code === 'ECONNABORTED') {
        throw new BadRequestException('File download timeout. The file may be too large or the server is slow.');
      } else {
        throw new BadRequestException(`Failed to download file from URL: ${error.message}`);
      }
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

  // Resume Templates
  async listResumeTemplates(): Promise<ResumeTemplateDocument[]> {
    const existing = await this.templateModel.find({ isActive: true }).exec();
    if (existing.length > 0) return existing;

    // Seed a few defaults if none exist
    const defaults: Array<Partial<ResumeTemplate>> = [
      { key: 'classic', name: 'Classic', defaultTheme: 'light', allowedThemes: ['light', 'dark', 'blue'], isActive: true },
      { key: 'modern', name: 'Modern', defaultTheme: 'light', allowedThemes: ['light', 'slate', 'emerald'], isActive: true },
      { key: 'elegant', name: 'Elegant', defaultTheme: 'light', allowedThemes: ['light', 'rose', 'violet'], isActive: true },
    ];
    await this.templateModel.insertMany(defaults);
    return this.templateModel.find({ isActive: true }).exec();
  }

  async seedResumeTemplates(): Promise<ResumeTemplateDocument[]> {
    return this.listResumeTemplates();
  }

  // Resume Versions CRUD
  async listResumeVersions(userId: string): Promise<ResumeVersionDocument[]> {
    return this.versionModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('template')
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getResumeVersion(userId: string, versionId: string): Promise<ResumeVersionDocument> {
    const version = await this.versionModel
      .findOne({ _id: versionId, user: new Types.ObjectId(userId) })
      .populate('template');
    if (!version) throw new NotFoundException('Resume version not found');
    return version;
  }

  async createResumeVersion(userId: string, payload: { name: string; templateId: string; theme?: string; sections?: Record<string, any>; isDefault?: boolean; }): Promise<ResumeVersionDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const template = await this.templateModel.findById(payload.templateId);
    if (!template) throw new BadRequestException('Invalid template');

    const version = await this.versionModel.create({
      user: new Types.ObjectId(userId),
      name: payload.name,
      template: template._id,
      theme: payload.theme || template.defaultTheme || 'light',
      sections: payload.sections || {},
      isDefault: !!payload.isDefault,
    });

    // Link on user
    (user as any).resumeVersions = [
      ...((user as any).resumeVersions || []),
      version._id,
    ];
    if (payload.isDefault || !(user as any).defaultResumeVersion) {
      (user as any).defaultResumeVersion = version._id;
    }
    await user.save();

    return version.populate('template');
  }

  async updateResumeVersion(userId: string, versionId: string, payload: Partial<{ name: string; templateId: string; theme: string; sections: Record<string, any>; isDefault: boolean; }>): Promise<ResumeVersionDocument> {
    const version = await this.versionModel.findOne({ _id: versionId, user: new Types.ObjectId(userId) });
    if (!version) throw new NotFoundException('Resume version not found');

    if (payload.templateId) {
      const tpl = await this.templateModel.findById(payload.templateId);
      if (!tpl) throw new BadRequestException('Invalid template');
      (version as any).template = tpl._id;
    }
    if (payload.name !== undefined) version.name = payload.name;
    if (payload.theme !== undefined) version.theme = payload.theme;
    if (payload.sections !== undefined) version.sections = payload.sections;
    if (payload.isDefault !== undefined) version.isDefault = payload.isDefault;

    await version.save();

    if (payload.isDefault) {
      await this.userModel.findByIdAndUpdate(userId, { defaultResumeVersion: version._id });
    }

    return version.populate('template');
  }

  async deleteResumeVersion(userId: string, versionId: string): Promise<void> {
    const version = await this.versionModel.findOneAndDelete({ _id: versionId, user: new Types.ObjectId(userId) });
    if (!version) throw new NotFoundException('Resume version not found');

    await this.userModel.findByIdAndUpdate(userId, {
      $pull: { resumeVersions: version._id },
      $unset: { defaultResumeVersion: '' },
    });
  }

  // Render resume HTML for export (server-side HTML; PDF generation can be layered later)
  async renderResumeHtml(userId: string, versionId: string): Promise<string> {
    const version = await this.versionModel
      .findOne({ _id: versionId, user: new Types.ObjectId(userId) })
      .populate('template');
    if (!version) throw new NotFoundException('Resume version not found');

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const sectionsConfig = (version as any).sections || {};
    const order: string[] = sectionsConfig.order || [];
    const enabled: Record<string, boolean> = sectionsConfig.enabled || {};

    const safe = (val?: string) => (val ? String(val) : '');

    function renderSection(key: string): string {
      if (!enabled[key]) return '';
      switch (key) {
        case 'personal':
          return `
            <section class="section personal">
              <h1 class="name">${safe(user.fullName)}</h1>
              <div class="meta">${safe((user as any).professionalTitle)}${(user as any).location ? ' · ' + safe((user as any).location) : ''}</div>
              <div class="links">${[safe(user.email), safe((user as any).phone), safe((user as any).website)].filter(Boolean).join(' · ')}</div>
            </section>
          `;
        case 'summary':
          return (user as any).bio ? `
            <section class="section">
              <h2>Summary</h2>
              <p>${safe((user as any).bio)}</p>
            </section>
          ` : '';
        case 'experience': {
          const items: any[] = (user as any).cvExperience || [];
          if (!items.length) return '';
          return `
            <section class="section">
              <h2>Experience</h2>
              ${items.map((exp) => `
                <div class="item">
                  <div class="row">
                    <strong>${safe(exp.title)}</strong>
                    <span>${safe(exp.company)}</span>
                    <span class="muted">${safe(exp.startDate)}${exp.endDate ? ' – ' + safe(exp.endDate) : ''}</span>
                  </div>
                  <div class="desc">${safe(exp.description)}</div>
                  ${Array.isArray(exp.achievements) && exp.achievements.length ? `
                    <ul>
                      ${exp.achievements.map((a: string) => `<li>${safe(a)}</li>`).join('')}
                    </ul>
                  ` : ''}
                </div>
              `).join('')}
            </section>
          `;
        }
        case 'education': {
          const items: any[] = (user as any).cvEducation || [];
          if (!items.length) return '';
          return `
            <section class="section">
              <h2>Education</h2>
              ${items.map((edu) => `
                <div class="item">
                  <div class="row">
                    <strong>${safe(edu.degree)}</strong>
                    <span>${safe(edu.institution)}</span>
                    <span class="muted">${safe(edu.startDate)}${edu.endDate ? ' – ' + safe(edu.endDate) : ''}</span>
                  </div>
                  <div class="desc">${safe(edu.description)}</div>
                </div>
              `).join('')}
            </section>
          `;
        }
        case 'skills': {
          const skills: any[] = (user as any).cvSkills || [];
          if (!skills.length) return '';
          return `
            <section class="section">
              <h2>Skills</h2>
              <div class="tags">${skills.map((s) => `<span class="tag">${safe(s.name)}</span>`).join('')}</div>
            </section>
          `;
        }
        case 'projects': {
          const items: any[] = (user as any).projects || [];
          if (!items.length) return '';
          return `
            <section class="section">
              <h2>Projects</h2>
              ${items.map((p) => `
                <div class="item">
                  <div class="row"><strong>${safe(p.name)}</strong> <span class="muted">${(p as any).url || ''}</span></div>
                  <div class="desc">${safe(p.description)}</div>
                </div>
              `).join('')}
            </section>
          `;
        }
        case 'certifications': {
          const items: any[] = (user as any).certifications || [];
          if (!items.length) return '';
          return `
            <section class="section">
              <h2>Certifications</h2>
              <ul>
                ${items.map((c) => `<li><strong>${safe(c.name)}</strong> — ${safe(c.issuer)} (${safe(c.date)})</li>`).join('')}
              </ul>
            </section>
          `;
        }
        case 'languages': {
          const items: any[] = (user as any).languages || [];
          if (!items.length) return '';
          return `
            <section class="section">
              <h2>Languages</h2>
              <ul>
                ${items.map((l) => `<li>${safe(l.language)} — ${safe(l.proficiency)}</li>`).join('')}
              </ul>
            </section>
          `;
        }
        default:
          return '';
      }
    }

    const ordered = order.length ? order : ['personal', 'summary', 'experience', 'education', 'skills'];

    const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${safe(version.name)} — ${safe(user.fullName)}</title>
        <style>
          body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #111; }
          .container { width: 800px; margin: 24px auto; }
          .section { margin: 16px 0; }
          h1 { font-size: 28px; margin: 0 0 4px; }
          h2 { font-size: 16px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: .08em; color: #444; }
          .meta { color: #666; font-size: 14px; }
          .links { color: #666; font-size: 13px; }
          .row { display: flex; gap: 12px; align-items: baseline; }
          .muted { color: #888; font-size: 12px; }
          .item { margin: 8px 0; }
          .desc { white-space: pre-wrap; }
          .tags { display: flex; gap: 6px; flex-wrap: wrap; }
          .tag { background: #f1f5f9; color: #0f172a; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
          @media print { .container { width: auto; margin: 0; } }
        </style>
      </head>
      <body>
        <div class="container">
          ${ordered.map(renderSection).join('')}
        </div>
      </body>
    </html>`;

    return html;
  }

  async renderResumeHtmlPublic(versionId: string): Promise<string> {
    const version = await this.versionModel.findById(versionId);
    if (!version) throw new NotFoundException('Resume version not found');
    return this.renderResumeHtml(String((version as any).user), versionId);
  }

  // Very simple ATS-style keyword matching against a job description
  async computeAtsScore(userId: string, versionId: string | undefined, jobDescription: string): Promise<{ score: number; matched: string[]; missing: string[]; extractedKeywords: string[]; }> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9+.#\s-]/g, ' ').replace(/\s+/g, ' ').trim();
    const tokenize = (s: string) => Array.from(new Set(normalize(s).split(' ').filter(Boolean)));

    // Extract resume keywords from user's CV fields
    const skillTokens = ((user as any).cvSkills || []).map((s: any) => String(s.name || ''));
    const experienceText = ((user as any).cvExperience || []).map((e: any) => `${e.title} ${e.company} ${e.description} ${(e.achievements||[]).join(' ')}`).join(' ');
    const educationText = ((user as any).cvEducation || []).map((e: any) => `${e.degree} ${e.institution} ${e.description || ''}`).join(' ');
    const projectsText = ((user as any).projects || []).map((p: any) => `${p.name} ${p.description} ${(p.technologies||[]).join(' ')}`).join(' ');
    const summary = `${(user as any).professionalTitle || ''} ${(user as any).bio || ''}`;

    const resumeCorpus = [summary, ...skillTokens, experienceText, educationText, projectsText].join(' ');
    const resumeTokens = new Set(tokenize(resumeCorpus));

    // Extract keywords from job description (naive)
    const jdTokens = tokenize(jobDescription);

    // Heuristic: ignore very short/common words
    const stop = new Set(['and','or','with','for','to','of','the','a','an','in','on','at','by','is','are','as']);
    const jdKeywords = jdTokens.filter(t => t.length > 2 && !stop.has(t));

    const matched: string[] = [];
    const missing: string[] = [];
    for (const kw of jdKeywords) {
      if (resumeTokens.has(kw)) matched.push(kw); else missing.push(kw);
    }

    const score = jdKeywords.length ? Math.round((matched.length / jdKeywords.length) * 100) : 0;

    return {
      score,
      matched: matched.slice(0, 100),
      missing: missing.slice(0, 100),
      extractedKeywords: jdKeywords.slice(0, 200),
    };
  }

  // AI Assist (heuristic fallback if AI is disabled): rewrite bullets / extract skills
  async aiAssist(mode: 'rewrite' | 'extract_skills', text: string): Promise<any> {
    const enabled = String(process.env.AI_ASSIST_ENABLED || 'false') === 'true';
    // For now we return heuristic results even if disabled, but include the flag in response
    const normalized = text.replace(/\r/g, '').trim();
    if (mode === 'rewrite') {
      const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);
      const verbs = ['Led','Built','Developed','Implemented','Optimized','Improved','Designed','Automated','Increased','Reduced'];
      const improve = (l: string, idx: number) => {
        let s = l.replace(/^[-•\s]+/, '');
        // Capitalize first letter
        s = s.charAt(0).toUpperCase() + s.slice(1);
        // Ensure starts with a verb
        if (!/^[A-Z][a-z]+\b/.test(s)) {
          s = `${verbs[idx % verbs.length]} ${s}`;
        }
        // Add impact hint if missing numbers
        if (!/\d/.test(s)) {
          s = `${s} resulting in a measurable impact (e.g., +15% performance).`;
        }
        return `• ${s}`;
      };
      const rewritten = lines.map(improve).join('\n');
      return { enabled, mode, suggestions: rewritten };
    }

    // extract_skills
    const tokens = normalized.split(/[^A-Za-z0-9+.#-]+/).filter(Boolean);
    const candidates = new Set<string>();
    for (const t of tokens) {
      const k = t.trim();
      if (k.length < 2) continue;
      if (/[A-Z]/.test(k.charAt(0)) || /(js|ts|sql|aws|gcp|ci|cd|api|ui|ux|ml|ai|qa|qa)/i.test(k)) {
        candidates.add(k);
      }
    }
    const list = Array.from(candidates).slice(0, 50);
    return { enabled, mode, skills: list };
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

