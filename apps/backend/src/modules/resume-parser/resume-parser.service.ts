import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

export interface ParsedResumeData {
  personalInfo: {
    fullName?: string;
    email?: string;
    phone?: string;
    location?: string;
    professionalTitle?: string;
    summary?: string;
  };
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    current: boolean;
    description: string;
    achievements?: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    current: boolean;
    gpa?: string;
    description?: string;
  }>;
  skills: string[];
  certifications: Array<{
    name: string;
    issuer: string;
    date: string;
    expiryDate?: string;
    credentialId?: string;
  }>;
  languages: Array<{
    language: string;
    proficiency: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    technologies?: string[];
    url?: string;
    startDate?: string;
    endDate?: string;
  }>;
  additionalInfo?: {
    linkedinUrl?: string;
    githubUrl?: string;
    website?: string;
    portfolioUrl?: string;
  };
}

@Injectable()
export class ResumeParserService {
  private readonly logger = new Logger(ResumeParserService.name);

  async parseResume(filePath: string, originalName: string): Promise<ParsedResumeData> {
    try {
      const fileExtension = path.extname(originalName).toLowerCase();
      let text: string;

      // Extract text based on file type
      if (fileExtension === '.pdf') {
        text = await this.extractTextFromPDF(filePath);
      } else if (fileExtension === '.docx') {
        text = await this.extractTextFromDocx(filePath);
      } else if (fileExtension === '.doc') {
        // For .doc files, we'll need to convert them or use a different library
        // For now, we'll treat them as text files
        text = await this.extractTextFromTextFile(filePath);
      } else {
        text = await this.extractTextFromTextFile(filePath);
      }

      this.logger.log(`Extracted text from ${originalName}: ${text.length} characters`);

      // Parse the extracted text
      const parsedData = this.parseText(text);

      return parsedData;
    } catch (error) {
      this.logger.error(`Error parsing resume ${originalName}:`, error);
      throw new Error(`Failed to parse resume: ${error.message}`);
    }
  }

  private async extractTextFromPDF(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      this.logger.error('Error extracting text from PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  private async extractTextFromDocx(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      this.logger.error('Error extracting text from DOCX:', error);
      throw new Error('Failed to extract text from DOCX');
    }
  }

  private async extractTextFromTextFile(filePath: string): Promise<string> {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      this.logger.error('Error reading text file:', error);
      throw new Error('Failed to read text file');
    }
  }

  private parseText(text: string): ParsedResumeData {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const parsedData: ParsedResumeData = {
      personalInfo: {},
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      languages: [],
      projects: [],
      additionalInfo: {}
    };

    // Extract personal information
    parsedData.personalInfo = this.extractPersonalInfo(text, lines);
    
    // Extract experience
    parsedData.experience = this.extractExperience(text, lines);
    
    // Extract education
    parsedData.education = this.extractEducation(text, lines);
    
    // Extract skills
    parsedData.skills = this.extractSkills(text, lines);
    
    // Extract certifications
    parsedData.certifications = this.extractCertifications(text, lines);
    
    // Extract languages
    parsedData.languages = this.extractLanguages(text, lines);
    
    // Extract projects
    parsedData.projects = this.extractProjects(text, lines);
    
    // Extract additional info (social links, etc.)
    parsedData.additionalInfo = this.extractAdditionalInfo(text, lines);

    return parsedData;
  }

  private extractPersonalInfo(text: string, lines: string[]): ParsedResumeData['personalInfo'] {
    const personalInfo: ParsedResumeData['personalInfo'] = {};

    // Extract name (usually the first line or largest text)
    const namePatterns = [
      /^[A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/,
      /^[A-Z][A-Z\s]+$/,
    ];

    for (const line of lines.slice(0, 5)) { // Check first 5 lines
      if (namePatterns.some(pattern => pattern.test(line)) && line.length > 3) {
        personalInfo.fullName = line;
        break;
      }
    }

    // Extract email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      personalInfo.email = emailMatch[0];
    }

    // Extract phone
    const phonePatterns = [
      /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/,
      /(\+?[0-9]{1,4}[-.\s]?)?\(?[0-9]{3,4}\)?[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}/,
    ];

    for (const pattern of phonePatterns) {
      const phoneMatch = text.match(pattern);
      if (phoneMatch) {
        personalInfo.phone = phoneMatch[0].replace(/[^\d+]/g, '');
        break;
      }
    }

    // Extract location
    const locationPatterns = [
      /([A-Z][a-z]+(?:[,\s]+[A-Z][a-z]+)*,\s*[A-Z]{2})/,
      /([A-Z][a-z]+(?:[,\s]+[A-Z][a-z]+)*,\s*[A-Z][a-z]+)/,
    ];

    for (const pattern of locationPatterns) {
      const locationMatch = text.match(pattern);
      if (locationMatch) {
        personalInfo.location = locationMatch[1];
        break;
      }
    }

    // Extract professional title (look for common job titles)
    const titleKeywords = [
      'Manager', 'Director', 'Engineer', 'Developer', 'Analyst', 'Specialist',
      'Coordinator', 'Assistant', 'Supervisor', 'Lead', 'Senior', 'Junior',
      'Executive', 'Consultant', 'Advisor', 'Representative', 'Agent',
      'Technician', 'Administrator', 'Coordinator', 'Officer', 'Associate'
    ];

    for (const line of lines.slice(0, 10)) {
      for (const keyword of titleKeywords) {
        if (line.toLowerCase().includes(keyword.toLowerCase()) && line.length < 100) {
          personalInfo.professionalTitle = line;
          break;
        }
      }
      if (personalInfo.professionalTitle) break;
    }

    // Extract summary/objective
    const summaryKeywords = ['summary', 'objective', 'profile', 'about', 'overview'];
    let summaryStart = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (summaryKeywords.some(keyword => lines[i].toLowerCase().includes(keyword))) {
        summaryStart = i;
        break;
      }
    }

    if (summaryStart !== -1) {
      const summaryLines = [];
      for (let i = summaryStart + 1; i < Math.min(summaryStart + 5, lines.length); i++) {
        if (lines[i].length > 20) {
          summaryLines.push(lines[i]);
        } else {
          break;
        }
      }
      personalInfo.summary = summaryLines.join(' ');
    }

    return personalInfo;
  }

  private extractExperience(text: string, lines: string[]): ParsedResumeData['experience'] {
    const experience: ParsedResumeData['experience'] = [];
    const experienceKeywords = ['experience', 'employment', 'work history', 'career', 'professional experience'];
    
    let experienceStart = -1;
    for (let i = 0; i < lines.length; i++) {
      if (experienceKeywords.some(keyword => lines[i].toLowerCase().includes(keyword))) {
        experienceStart = i;
        break;
      }
    }

    if (experienceStart === -1) return experience;

    // Look for job entries (typically have dates and company names)
    const datePattern = /(\d{4}|\d{1,2}\/\d{4}|\d{1,2}-\d{4}|present|current|now)/i;
    const monthYearPattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}/i;

    for (let i = experienceStart + 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip if we hit another major section
      if (this.isMajorSection(line)) break;

      // Look for job title and company pattern
      if (line.length > 10 && line.length < 100) {
        const hasDate = datePattern.test(line) || monthYearPattern.test(line);
        
        if (hasDate || this.looksLikeJobTitle(line)) {
          const jobEntry = this.parseJobEntry(lines, i);
          if (jobEntry) {
            experience.push(jobEntry);
            i = jobEntry.endIndex || i; // Skip processed lines
          }
        }
      }
    }

    return experience;
  }

  private extractEducation(text: string, lines: string[]): ParsedResumeData['education'] {
    const education: ParsedResumeData['education'] = [];
    const educationKeywords = ['education', 'academic', 'qualifications', 'degrees', 'university', 'college'];
    
    let educationStart = -1;
    for (let i = 0; i < lines.length; i++) {
      if (educationKeywords.some(keyword => lines[i].toLowerCase().includes(keyword))) {
        educationStart = i;
        break;
      }
    }

    if (educationStart === -1) return education;

    const degreeKeywords = ['bachelor', 'master', 'phd', 'doctorate', 'associate', 'diploma', 'certificate', 'degree'];
    const institutionKeywords = ['university', 'college', 'institute', 'school', 'academy'];

    for (let i = educationStart + 1; i < lines.length; i++) {
      const line = lines[i];
      
      if (this.isMajorSection(line)) break;

      if (degreeKeywords.some(keyword => line.toLowerCase().includes(keyword)) ||
          institutionKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
        const educationEntry = this.parseEducationEntry(lines, i);
        if (educationEntry) {
          education.push(educationEntry);
          i = educationEntry.endIndex || i;
        }
      }
    }

    return education;
  }

  private extractSkills(text: string, lines: string[]): string[] {
    const skills: string[] = [];
    const skillsKeywords = ['skills', 'technical skills', 'competencies', 'expertise', 'technologies'];
    
    let skillsStart = -1;
    for (let i = 0; i < lines.length; i++) {
      if (skillsKeywords.some(keyword => lines[i].toLowerCase().includes(keyword))) {
        skillsStart = i;
        break;
      }
    }

    if (skillsStart === -1) return skills;

    // Common skills across industries
    const commonSkills = [
      // Technical
      'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Swift', 'Kotlin',
      'HTML', 'CSS', 'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask',
      'SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'AWS', 'Azure', 'Docker', 'Kubernetes',
      'Git', 'GitHub', 'GitLab', 'Jenkins', 'CI/CD', 'REST API', 'GraphQL', 'Microservices',
      
      // Business
      'Project Management', 'Agile', 'Scrum', 'Lean', 'Six Sigma', 'Business Analysis',
      'Financial Analysis', 'Budget Management', 'Strategic Planning', 'Risk Management',
      'Customer Service', 'Sales', 'Marketing', 'Digital Marketing', 'SEO', 'SEM',
      'Data Analysis', 'Excel', 'Power BI', 'Tableau', 'SAS', 'R', 'Statistics',
      
      // Soft Skills
      'Leadership', 'Team Management', 'Communication', 'Problem Solving', 'Critical Thinking',
      'Time Management', 'Organization', 'Adaptability', 'Creativity', 'Negotiation',
      
      // Industry Specific
      'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Retail', 'Hospitality',
      'Construction', 'Real Estate', 'Legal', 'Government', 'Non-profit'
    ];

    // Extract skills from the skills section
    for (let i = skillsStart + 1; i < Math.min(skillsStart + 10, lines.length); i++) {
      const line = lines[i];
      if (this.isMajorSection(line)) break;

      // Split by common separators
      const skillCandidates = line.split(/[,;|•\-\n]/).map(s => s.trim()).filter(s => s.length > 0);
      
      for (const candidate of skillCandidates) {
        if (candidate.length > 2 && candidate.length < 50) {
          // Check if it matches common skills or looks like a skill
          if (commonSkills.some(skill => 
            skill.toLowerCase().includes(candidate.toLowerCase()) ||
            candidate.toLowerCase().includes(skill.toLowerCase())
          )) {
            skills.push(candidate);
          } else if (this.looksLikeSkill(candidate)) {
            skills.push(candidate);
          }
        }
      }
    }

    return [...new Set(skills)]; // Remove duplicates
  }

  private extractCertifications(text: string, lines: string[]): ParsedResumeData['certifications'] {
    const certifications: ParsedResumeData['certifications'] = [];
    const certKeywords = ['certification', 'certificate', 'license', 'credential', 'certified'];
    
    let certStart = -1;
    for (let i = 0; i < lines.length; i++) {
      if (certKeywords.some(keyword => lines[i].toLowerCase().includes(keyword))) {
        certStart = i;
        break;
      }
    }

    if (certStart === -1) return certifications;

    for (let i = certStart + 1; i < lines.length; i++) {
      const line = lines[i];
      if (this.isMajorSection(line)) break;

      if (line.length > 5 && line.length < 100) {
        const cert = this.parseCertificationEntry(line);
        if (cert) {
          certifications.push(cert);
        }
      }
    }

    return certifications;
  }

  private extractLanguages(text: string, lines: string[]): ParsedResumeData['languages'] {
    const languages: ParsedResumeData['languages'] = [];
    const languageKeywords = ['languages', 'language proficiency', 'bilingual', 'multilingual'];
    
    let langStart = -1;
    for (let i = 0; i < lines.length; i++) {
      if (languageKeywords.some(keyword => lines[i].toLowerCase().includes(keyword))) {
        langStart = i;
        break;
      }
    }

    if (langStart === -1) return languages;

    const proficiencyLevels = ['native', 'fluent', 'advanced', 'intermediate', 'beginner', 'basic'];
    const commonLanguages = ['english', 'spanish', 'french', 'german', 'italian', 'portuguese', 'chinese', 'japanese', 'korean', 'arabic', 'russian'];

    for (let i = langStart + 1; i < Math.min(langStart + 5, lines.length); i++) {
      const line = lines[i];
      if (this.isMajorSection(line)) break;

      const langCandidates = line.split(/[,;|•\-\n]/).map(s => s.trim()).filter(s => s.length > 0);
      
      for (const candidate of langCandidates) {
        const lowerCandidate = candidate.toLowerCase();
        const language = commonLanguages.find(lang => lowerCandidate.includes(lang));
        const proficiency = proficiencyLevels.find(level => lowerCandidate.includes(level));
        
        if (language) {
          languages.push({
            language: candidate,
            proficiency: proficiency || 'intermediate'
          });
        }
      }
    }

    return languages;
  }

  private extractProjects(text: string, lines: string[]): ParsedResumeData['projects'] {
    const projects: ParsedResumeData['projects'] = [];
    const projectKeywords = ['projects', 'portfolio', 'work samples', 'key projects'];
    
    let projectStart = -1;
    for (let i = 0; i < lines.length; i++) {
      if (projectKeywords.some(keyword => lines[i].toLowerCase().includes(keyword))) {
        projectStart = i;
        break;
      }
    }

    if (projectStart === -1) return projects;

    for (let i = projectStart + 1; i < lines.length; i++) {
      const line = lines[i];
      if (this.isMajorSection(line)) break;

      if (line.length > 10 && line.length < 100) {
        const project = this.parseProjectEntry(lines, i);
        if (project) {
          projects.push(project);
          i = project.endIndex || i;
        }
      }
    }

    return projects;
  }

  private extractAdditionalInfo(text: string, lines: string[]): ParsedResumeData['additionalInfo'] {
    const additionalInfo: ParsedResumeData['additionalInfo'] = {};

    // Extract LinkedIn URL
    const linkedinMatch = text.match(/linkedin\.com\/in\/[a-zA-Z0-9-]+/i);
    if (linkedinMatch) {
      additionalInfo.linkedinUrl = `https://www.${linkedinMatch[0]}`;
    }

    // Extract GitHub URL
    const githubMatch = text.match(/github\.com\/[a-zA-Z0-9-]+/i);
    if (githubMatch) {
      additionalInfo.githubUrl = `https://www.${githubMatch[0]}`;
    }

    // Extract website/portfolio URL
    const websiteMatch = text.match(/(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/i);
    if (websiteMatch && !websiteMatch[0].includes('linkedin') && !websiteMatch[0].includes('github')) {
      additionalInfo.website = websiteMatch[0].startsWith('http') ? websiteMatch[0] : `https://${websiteMatch[0]}`;
    }

    return additionalInfo;
  }

  // Helper methods
  private isMajorSection(line: string): boolean {
    const majorSections = [
      'experience', 'education', 'skills', 'certifications', 'projects', 'languages',
      'employment', 'academic', 'qualifications', 'competencies', 'portfolio'
    ];
    return majorSections.some(section => line.toLowerCase().includes(section));
  }

  private looksLikeJobTitle(line: string): boolean {
    const jobTitleKeywords = ['manager', 'director', 'engineer', 'developer', 'analyst', 'specialist', 'coordinator', 'assistant', 'supervisor', 'lead', 'senior', 'junior', 'executive', 'consultant', 'advisor', 'representative', 'agent', 'technician', 'administrator', 'officer', 'associate'];
    return jobTitleKeywords.some(keyword => line.toLowerCase().includes(keyword));
  }

  private looksLikeSkill(skill: string): boolean {
    // Skills are typically 2-50 characters, contain letters, may contain numbers, spaces, or special characters
    return skill.length >= 2 && skill.length <= 50 && /[a-zA-Z]/.test(skill);
  }

  private parseJobEntry(lines: string[], startIndex: number): any {
    // This is a simplified parser - in a real implementation, you'd want more sophisticated parsing
    const jobEntry = {
      title: '',
      company: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
      achievements: [],
      endIndex: startIndex
    };

    // Look for job title and company in the next few lines
    for (let i = startIndex; i < Math.min(startIndex + 5, lines.length); i++) {
      const line = lines[i];
      if (this.isMajorSection(line)) break;

      if (line.length > 5 && line.length < 100) {
        if (!jobEntry.title && this.looksLikeJobTitle(line)) {
          jobEntry.title = line;
        } else if (!jobEntry.company && line.length > 3 && line.length < 50) {
          jobEntry.company = line;
        }
      }
    }

    jobEntry.endIndex = startIndex + 1;
    return jobEntry.title ? jobEntry : null;
  }

  private parseEducationEntry(lines: string[], startIndex: number): any {
    const educationEntry = {
      degree: '',
      institution: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      gpa: '',
      description: '',
      endIndex: startIndex
    };

    for (let i = startIndex; i < Math.min(startIndex + 3, lines.length); i++) {
      const line = lines[i];
      if (this.isMajorSection(line)) break;

      if (line.length > 5 && line.length < 100) {
        if (!educationEntry.degree && (line.toLowerCase().includes('bachelor') || line.toLowerCase().includes('master') || line.toLowerCase().includes('phd') || line.toLowerCase().includes('degree'))) {
          educationEntry.degree = line;
        } else if (!educationEntry.institution && (line.toLowerCase().includes('university') || line.toLowerCase().includes('college') || line.toLowerCase().includes('institute'))) {
          educationEntry.institution = line;
        }
      }
    }

    educationEntry.endIndex = startIndex + 1;
    return educationEntry.degree ? educationEntry : null;
  }

  private parseCertificationEntry(line: string): any {
    const cert = {
      name: '',
      issuer: '',
      date: '',
      expiryDate: '',
      credentialId: ''
    };

    // Simple parsing - look for certification name and issuer
    const parts = line.split(/[,;|•\-\n]/).map(s => s.trim()).filter(s => s.length > 0);
    
    if (parts.length >= 2) {
      cert.name = parts[0];
      cert.issuer = parts[1];
    } else {
      cert.name = line;
    }

    return cert.name ? cert : null;
  }

  private parseProjectEntry(lines: string[], startIndex: number): any {
    const project = {
      name: '',
      description: '',
      technologies: [],
      url: '',
      startDate: '',
      endDate: '',
      endIndex: startIndex
    };

    const line = lines[startIndex];
    if (line.length > 5 && line.length < 100) {
      project.name = line;
      project.endIndex = startIndex + 1;
      return project;
    }

    return null;
  }
}
