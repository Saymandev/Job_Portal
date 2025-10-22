import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Job, JobDocument } from './schemas/job.schema';
import { SavedJob, SavedJobDocument } from './schemas/saved-job.schema';

@Injectable()
export class SavedJobsService {
  constructor(
    @InjectModel(SavedJob.name) private savedJobModel: Model<SavedJobDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async saveJob(userId: string, jobId: string, tags?: string[], notes?: string): Promise<SavedJobDocument> {
    // Check if job exists
    const job = await this.jobModel.findById(jobId);
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Check if already saved
    const existingSavedJob = await this.savedJobModel.findOne({ 
      userId, 
      jobId, 
      isActive: true 
    });
    
    if (existingSavedJob) {
      throw new ConflictException('Job already saved');
    }

    // Create new saved job
    const savedJob = new this.savedJobModel({
      userId,
      jobId,
      tags: tags || [],
      notes: notes || '',
      savedAt: new Date(),
      isActive: true,
      viewCount: 0,
    });

    return await savedJob.save();
  }

  async unsaveJob(userId: string, jobId: string): Promise<void> {
    const result = await this.savedJobModel.findOneAndUpdate(
      { userId, jobId, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!result) {
      throw new NotFoundException('Saved job not found');
    }
  }

  async getSavedJobs(userId: string, page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;

    const [savedJobs, total] = await Promise.all([
      this.savedJobModel
        .find({ userId, isActive: true })
        .populate({
          path: 'jobId',
          select: 'title description location salaryMin salaryMax experienceLevel jobType skills status',
          populate: {
            path: 'company',
            select: 'name logo location'
          }
        })
        .sort({ savedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.savedJobModel.countDocuments({ userId, isActive: true }),
    ]);

    // Filter out saved jobs where the job was not populated (job deleted)
    const validSavedJobs = savedJobs.filter(savedJob => savedJob.jobId !== null);
    
    
    
    

    return {
      data: validSavedJobs,
      meta: {
        total: validSavedJobs.length,
        page,
        limit,
        totalPages: Math.ceil(validSavedJobs.length / limit),
        hasNextPage: page < Math.ceil(validSavedJobs.length / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async getSavedJobById(userId: string, savedJobId: string): Promise<SavedJobDocument> {
    const savedJob = await this.savedJobModel
      .findOne({ _id: savedJobId, userId, isActive: true })
      .populate({
        path: 'job',
        populate: {
          path: 'company',
          select: 'name logo location description'
        }
      })
      .exec();

    if (!savedJob) {
      throw new NotFoundException('Saved job not found');
    }

    // Increment view count
    await this.savedJobModel.findByIdAndUpdate(savedJobId, { 
      $inc: { viewCount: 1 } 
    });

    return savedJob;
  }

  async updateSavedJob(
    userId: string, 
    savedJobId: string, 
    tags?: string[], 
    notes?: string
  ): Promise<SavedJobDocument> {
    const updateData: any = {};
    
    if (tags !== undefined) updateData.tags = tags;
    if (notes !== undefined) updateData.notes = notes;

    const savedJob = await this.savedJobModel.findOneAndUpdate(
      { _id: savedJobId, userId, isActive: true },
      updateData,
      { new: true }
    ).populate({
      path: 'job',
      populate: {
        path: 'company',
        select: 'name logo location'
      }
    }).exec();

    if (!savedJob) {
      throw new NotFoundException('Saved job not found');
    }

    return savedJob;
  }

  async getSavedJobStats(userId: string): Promise<any> {
    const totalSaved = await this.savedJobModel.countDocuments({ userId, isActive: true });
    
    const recentSaved = await this.savedJobModel.countDocuments({
      userId,
      isActive: true,
      savedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    const mostViewedJobs = await this.savedJobModel
      .find({ userId, isActive: true })
      .populate('job', 'title company')
      .sort({ viewCount: -1 })
      .limit(5)
      .exec();

    return {
      totalSaved,
      recentSaved,
      mostViewedJobs,
    };
  }

  async isJobSaved(userId: string, jobId: string): Promise<boolean> {
    const savedJob = await this.savedJobModel.findOne({ 
      userId, 
      jobId, 
      isActive: true 
    });
    return !!savedJob;
  }

  async getRecommendationsBasedOnSavedJobs(userId: string, limit: number = 10): Promise<any[]> {
    // Get user's saved jobs to analyze preferences
    const savedJobs = await this.savedJobModel
      .find({ userId, isActive: true })
      .populate('jobId', 'skills experienceLevel jobType location company')
      .exec();

    if (savedJobs.length === 0) {
      // If no saved jobs, return featured jobs with random match scores
      const featuredJobs = await this.jobModel
        .find({ status: 'open', isFeatured: true })
        .populate('company', 'name logo location')
        .sort({ createdAt: -1 })
        .limit(limit)
        .exec();

      return featuredJobs.map(job => {
        const jobObj = job.toObject();
        return {
          ...jobObj,
          matchScore: Math.floor(Math.random() * 30) + 70, // Random score between 70-100 for featured jobs
          salary: jobObj.salaryMin && jobObj.salaryMax ? {
            min: jobObj.salaryMin,
            max: jobObj.salaryMax,
            currency: jobObj.currency || 'USD'
          } : undefined
        };
      });
    }

    // Analyze user preferences from saved jobs
    const preferences = this.analyzeUserPreferences(savedJobs);

    // Find similar jobs based on preferences
    const query: any = {
      status: 'open',
      _id: { $nin: savedJobs.map(sj => {
        const jobId = sj.jobId as any;
        return typeof jobId === 'string' ? jobId : jobId._id;
      }) } // Exclude already saved jobs
    };

    // Build recommendation query based on preferences
    if (preferences.skills.length > 0) {
      query.skills = { $in: preferences.skills };
    }

    if (preferences.experienceLevels.length > 0) {
      query.experienceLevel = { $in: preferences.experienceLevels };
    }

    if (preferences.jobTypes.length > 0) {
      query.jobType = { $in: preferences.jobTypes };
    }

    if (preferences.locations.length > 0) {
      query.location = { $regex: preferences.locations.join('|'), $options: 'i' };
    }

    const recommendations = await this.jobModel
      .find(query)
      .populate('company', 'name logo location')
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(limit)
      .exec();

    // Calculate match scores for each recommendation
    const recommendationsWithScores = recommendations.map(job => {
      const matchScore = this.calculateMatchScore(job, preferences);
      const jobObj = job.toObject();
      return {
        ...jobObj,
        matchScore,
        salary: jobObj.salaryMin && jobObj.salaryMax ? {
          min: jobObj.salaryMin,
          max: jobObj.salaryMax,
          currency: jobObj.currency || 'USD'
        } : undefined
      };
    });

    return recommendationsWithScores;
  }

  private analyzeUserPreferences(savedJobs: SavedJobDocument[]): {
    skills: string[];
    experienceLevels: string[];
    jobTypes: string[];
    locations: string[];
    companies: string[];
  } {
    const skills = new Set<string>();
    const experienceLevels = new Set<string>();
    const jobTypes = new Set<string>();
    const locations = new Set<string>();
    const companies = new Set<string>();

    savedJobs.forEach(savedJob => {
      const job = savedJob.jobId as any;
      
      if (job.skills) {
        job.skills.forEach((skill: string) => skills.add(skill));
      }
      
      if (job.experienceLevel) {
        experienceLevels.add(job.experienceLevel);
      }
      
      if (job.jobType) {
        jobTypes.add(job.jobType);
      }
      
      if (job.location) {
        locations.add(job.location);
      }
      
      if (job.company) {
        companies.add(job.company.toString());
      }
    });

    return {
      skills: Array.from(skills),
      experienceLevels: Array.from(experienceLevels),
      jobTypes: Array.from(jobTypes),
      locations: Array.from(locations),
      companies: Array.from(companies),
    };
  }

  private calculateMatchScore(job: any, preferences: any): number {
    let score = 0;
    let totalWeight = 0;

    // Skills match (40% weight)
    if (preferences.skills.length > 0) {
      const matchingSkills = job.skills.filter((skill: string) => 
        preferences.skills.some((prefSkill: string) => 
          skill.toLowerCase().includes(prefSkill.toLowerCase()) || 
          prefSkill.toLowerCase().includes(skill.toLowerCase())
        )
      ).length;
      const skillScore = (matchingSkills / preferences.skills.length) * 100;
      score += skillScore * 0.4;
      totalWeight += 0.4;
    }

    // Experience level match (20% weight)
    if (preferences.experienceLevels.length > 0) {
      const experienceMatch = preferences.experienceLevels.includes(job.experienceLevel);
      score += (experienceMatch ? 100 : 0) * 0.2;
      totalWeight += 0.2;
    }

    // Job type match (20% weight)
    if (preferences.jobTypes.length > 0) {
      const jobTypeMatch = preferences.jobTypes.includes(job.jobType);
      score += (jobTypeMatch ? 100 : 0) * 0.2;
      totalWeight += 0.2;
    }

    // Location match (20% weight)
    if (preferences.locations.length > 0) {
      const locationMatch = preferences.locations.some((location: string) => 
        job.location.toLowerCase().includes(location.toLowerCase())
      );
      score += (locationMatch ? 100 : 0) * 0.2;
      totalWeight += 0.2;
    }

    // If no preferences, give a base score
    if (totalWeight === 0) {
      return Math.floor(Math.random() * 30) + 60; // Random score between 60-90
    }

    // Normalize score based on total weight
    const normalizedScore = totalWeight > 0 ? score / totalWeight : 0;
    
    // Add some randomness to make it more realistic
    const randomFactor = (Math.random() - 0.5) * 10; // ±5 points
    const finalScore = Math.max(0, Math.min(100, normalizedScore + randomFactor));
    
    return Math.round(finalScore);
  }
}
