import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from '../applications/schemas/application.schema';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class EnhancedMatchingService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
  ) {}

  /**
   * Enhanced candidate matching for premium employers
   * Uses advanced algorithms including salary preferences, company culture, and more
   */
  async findBestCandidatesForJob(
    jobId: string, 
    employerId: string, 
    limit: number = 10
  ): Promise<Array<{ candidate: any; matchScore: number; reasons: string[] }>> {
    const job = await this.jobModel.findById(jobId).populate('company');
    if (!job) {
      throw new Error('Job not found');
    }

    // Get all applications for this job
    const applications = await this.applicationModel
      .find({ job: jobId })
      .populate('applicant')
      .lean();

    // Calculate enhanced match scores for each candidate
    const candidatesWithScores = await Promise.all(
      applications.map(async (app) => {
        const candidate = app.applicant;
        const { score, reasons } = await this.calculateEnhancedMatchScore(job, candidate);
        
        return {
          candidate,
          matchScore: score,
          reasons,
          applicationId: app._id,
        };
      })
    );

    // Sort by match score (highest first) and return top candidates
    return candidatesWithScores
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  /**
   * Enhanced matching algorithm with multiple factors
   */
  private async calculateEnhancedMatchScore(job: any, candidate: any): Promise<{ score: number; reasons: string[] }> {
    try {
      let score = 0;
      const reasons: string[] = [];
      const weights = {
        skills: 0.35,
        experience: 0.20,
        location: 0.15,
        salary: 0.10,
        culture: 0.10,
        education: 0.05,
        availability: 0.05,
      };

    // 1. Skills Match (35% weight)
    const candidateSkills = Array.isArray(candidate.skills) ? candidate.skills : [];
    const skillsScore = this.calculateSkillsMatch(job.skills || [], candidateSkills);
    score += skillsScore * weights.skills;
    if (skillsScore > 80) reasons.push('Excellent skills match');
    else if (skillsScore > 60) reasons.push('Good skills match');

    // 2. Experience Level (20% weight)
    const experienceScore = this.calculateExperienceMatch(job.experienceLevel, candidate.experience);
    score += experienceScore * weights.experience;
    if (experienceScore > 80) reasons.push('Perfect experience level');
    else if (experienceScore > 60) reasons.push('Good experience level');

    // 3. Location Match (15% weight)
    const locationScore = this.calculateLocationMatch(job.location, candidate.location);
    score += locationScore * weights.location;
    if (locationScore > 80) reasons.push('Ideal location match');
    else if (locationScore > 60) reasons.push('Good location match');

    // 4. Salary Expectations (10% weight)
    const salaryScore = this.calculateSalaryMatch(job.salaryMin, job.salaryMax, candidate.expectedSalary);
    score += salaryScore * weights.salary;
    if (salaryScore > 80) reasons.push('Salary expectations aligned');
    else if (salaryScore > 60) reasons.push('Salary expectations reasonable');

    // 5. Company Culture Fit (10% weight)
    const cultureScore = this.calculateCultureMatch(job.company, candidate);
    score += cultureScore * weights.culture;
    if (cultureScore > 80) reasons.push('Great culture fit');
    else if (cultureScore > 60) reasons.push('Good culture fit');

    // 6. Education Background (5% weight)
    const educationScore = this.calculateEducationMatch(job, candidate.education || []);
    score += educationScore * weights.education;
    if (educationScore > 80) reasons.push('Excellent educational background');
    else if (educationScore > 60) reasons.push('Good educational background');

    // 7. Availability (5% weight)
    const availabilityScore = this.calculateAvailabilityMatch(candidate);
    score += availabilityScore * weights.availability;
    if (availabilityScore > 80) reasons.push('Available immediately');
    else if (availabilityScore > 60) reasons.push('Good availability');

    return {
      score: Math.round(Math.min(score, 100)),
      reasons: reasons.slice(0, 3), // Return top 3 reasons
    };
    } catch (error) {
      console.error('Error calculating enhanced match score:', error);
      console.error('Job data:', { 
        id: job?._id, 
        title: job?.title, 
        skills: job?.skills, 
        location: job?.location,
        experienceLevel: job?.experienceLevel 
      });
      console.error('Candidate data:', { 
        id: candidate?._id, 
        name: candidate?.fullName, 
        skills: candidate?.skills, 
        location: candidate?.location,
        experience: candidate?.experience 
      });
      return {
        score: 0,
        reasons: ['Error calculating match score'],
      };
    }
  }

  private calculateSkillsMatch(jobSkills: string[], candidateSkills: any[]): number {
    if (!jobSkills || !Array.isArray(jobSkills) || !jobSkills.length) return 0;
    if (!candidateSkills || !Array.isArray(candidateSkills) || !candidateSkills.length) return 0;
    
    // Normalize candidate skills to strings
    const normalizedCandidateSkills = candidateSkills.map(skill => {
      if (typeof skill === 'string') return skill;
      if (skill && typeof skill === 'object' && skill.name) return skill.name;
      return String(skill);
    }).filter(skill => skill && skill.trim().length > 0);
    
    const matchingSkills = jobSkills.filter(jobSkill =>
      normalizedCandidateSkills.some(candidateSkill =>
        jobSkill.toLowerCase().includes(candidateSkill.toLowerCase()) ||
        candidateSkill.toLowerCase().includes(jobSkill.toLowerCase())
      )
    );
    
    return (matchingSkills.length / jobSkills.length) * 100;
  }

  private calculateExperienceMatch(jobExperienceLevel: string, candidateExperience: any): number {
    if (!candidateExperience || !Array.isArray(candidateExperience) || candidateExperience.length === 0) return 0;
    
    const totalYears = candidateExperience.reduce((total, exp) => {
      if (!exp || !exp.startDate) return total;
      const startDate = new Date(exp.startDate);
      const endDate = exp.endDate ? new Date(exp.endDate) : new Date();
      const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      return total + years;
    }, 0);

    const experienceMap = {
      'entry': { min: 0, max: 2 },
      'mid': { min: 2, max: 5 },
      'senior': { min: 5, max: 10 },
      'lead': { min: 10, max: Infinity },
    };

    const required = experienceMap[jobExperienceLevel] || { min: 0, max: Infinity };
    
    if (totalYears >= required.min && totalYears <= required.max) return 100;
    if (totalYears >= required.min * 0.8) return 80;
    if (totalYears >= required.min * 0.6) return 60;
    return 40;
  }

  private calculateLocationMatch(jobLocation: string, candidateLocation: string): number {
    if (!candidateLocation || !jobLocation) return 0;
    
    const jobCity = jobLocation.toLowerCase().split(',')[0].trim();
    const candidateCity = candidateLocation.toLowerCase().split(',')[0].trim();
    
    if (jobCity === candidateCity) return 100;
    if (jobLocation.toLowerCase().includes('remote')) return 90;
    if (candidateLocation.toLowerCase().includes('remote')) return 85;
    
    // Check if same state/region
    const jobState = jobLocation.split(',')[1]?.trim().toLowerCase();
    const candidateState = candidateLocation.split(',')[1]?.trim().toLowerCase();
    if (jobState && candidateState && jobState === candidateState) return 70;
    
    return 30;
  }

  private calculateSalaryMatch(jobMinSalary: number, jobMaxSalary: number, candidateExpectedSalary: number): number {
    if (!candidateExpectedSalary || !jobMinSalary || !jobMaxSalary) return 50;
    
    const jobMidSalary = (jobMinSalary + jobMaxSalary) / 2;
    const salaryDiff = Math.abs(candidateExpectedSalary - jobMidSalary) / jobMidSalary;
    
    if (salaryDiff <= 0.1) return 100; // Within 10%
    if (salaryDiff <= 0.2) return 80;  // Within 20%
    if (salaryDiff <= 0.3) return 60;  // Within 30%
    return 40;
  }

  private calculateCultureMatch(company: any, candidate: any): number {
    // This is a simplified culture match based on company size and candidate preferences
    // In a real implementation, you'd have more sophisticated culture matching
    let score = 50; // Base score
    
    if (company.companySize && candidate.preferredCompanySize) {
      if (company.companySize === candidate.preferredCompanySize) score += 30;
      else score += 10;
    }
    
    if (candidate.workStyle === 'collaborative' && company.culture === 'team-oriented') score += 20;
    if (candidate.workStyle === 'independent' && company.culture === 'autonomous') score += 20;
    
    return Math.min(score, 100);
  }

  private calculateEducationMatch(job: any, candidateEducation: any): number {
    if (!candidateEducation || !Array.isArray(candidateEducation) || candidateEducation.length === 0) return 50;
    
    const highestDegree = candidateEducation.reduce((highest, edu) => {
      if (!edu || !edu.degree) return highest;
      const degreeLevel = this.getDegreeLevel(edu.degree);
      return degreeLevel > highest ? degreeLevel : highest;
    }, 0);
    
    // Simple scoring based on degree level
    if (highestDegree >= 4) return 100; // PhD
    if (highestDegree >= 3) return 90;  // Master's
    if (highestDegree >= 2) return 80;  // Bachelor's
    if (highestDegree >= 1) return 60;  // Associate's
    return 40;
  }

  private getDegreeLevel(degree: string): number {
    const degreeMap = {
      'phd': 4, 'doctorate': 4, 'ph.d': 4,
      'masters': 3, 'master': 3, 'ms': 3, 'ma': 3, 'mba': 3,
      'bachelors': 2, 'bachelor': 2, 'bs': 2, 'ba': 2,
      'associates': 1, 'associate': 1, 'aa': 1, 'as': 1,
    };
    
    return degreeMap[degree.toLowerCase()] || 0;
  }

  private calculateAvailabilityMatch(candidate: any): number {
    if (!candidate.availability) return 50;
    
    const availability = candidate.availability.toLowerCase();
    if (availability.includes('immediately') || availability.includes('available now')) return 100;
    if (availability.includes('2 weeks') || availability.includes('1 month')) return 80;
    if (availability.includes('3 months')) return 60;
    return 40;
  }
}
