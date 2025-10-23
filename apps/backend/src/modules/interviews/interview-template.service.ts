import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InterviewTemplate, InterviewTemplateDocument } from './schemas/interview-template.schema';

export interface CreateTemplateDto {
  name: string;
  description: string;
  questions: Array<{
    question: string;
    category: 'technical' | 'behavioral' | 'situational' | 'company-specific';
    difficulty: 'easy' | 'medium' | 'hard';
    expectedAnswer: string;
    tips: string[];
    timeLimit?: number;
  }>;
  duration: number;
  industry: string;
  role: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isPublic?: boolean;
  tags?: string[];
  metadata?: any;
}

export interface UpdateTemplateDto extends Partial<CreateTemplateDto> {}

export interface TemplateQuery {
  search?: string;
  industry?: string;
  role?: string;
  difficulty?: string;
  tags?: string[];
  isPublic?: boolean;
  createdBy?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class InterviewTemplateService {
  constructor(
    @InjectModel(InterviewTemplate.name)
    private templateModel: Model<InterviewTemplateDocument>,
  ) {}

  /**
   * Create a new interview template
   */
  async createTemplate(createTemplateDto: CreateTemplateDto, userId: string): Promise<InterviewTemplate> {
    const template = new this.templateModel({
      ...createTemplateDto,
      createdBy: userId,
    });

    return await template.save();
  }

  /**
   * Get all templates with filtering and pagination
   */
  async getTemplates(query: TemplateQuery): Promise<{
    templates: InterviewTemplate[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      search,
      industry,
      role,
      difficulty,
      tags,
      isPublic,
      createdBy,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = {};

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'questions.question': { $regex: search, $options: 'i' } },
      ];
    }

    // Other filters
    if (industry) filter.industry = { $regex: industry, $options: 'i' };
    if (role) filter.role = { $regex: role, $options: 'i' };
    if (difficulty) filter.difficulty = difficulty;
    if (isPublic !== undefined) filter.isPublic = isPublic;
    if (createdBy) filter.createdBy = createdBy;
    if (tags && tags.length > 0) {
      filter.tags = { $in: tags };
    }

    // Sorting
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      this.templateModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'name email')
        .exec(),
      this.templateModel.countDocuments(filter),
    ]);

    return {
      templates,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single template by ID
   */
  async getTemplateById(id: string): Promise<InterviewTemplate> {
    const template = await this.templateModel
      .findById(id)
      .populate('createdBy', 'name email')
      .exec();

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  /**
   * Update a template
   */
  async updateTemplate(
    id: string,
    updateTemplateDto: UpdateTemplateDto,
    userId: string,
  ): Promise<InterviewTemplate> {
    const template = await this.templateModel.findById(id);

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Check if user owns the template or is admin
    if (template.createdBy.toString() !== userId) {
      throw new ForbiddenException('You can only update your own templates');
    }

    Object.assign(template, updateTemplateDto);
    return await template.save();
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string, userId: string): Promise<void> {
    const template = await this.templateModel.findById(id);

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Check if user owns the template or is admin
    if (template.createdBy.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own templates');
    }

    await this.templateModel.findByIdAndDelete(id);
  }

  /**
   * Use a template (increment usage count)
   */
  async useTemplate(id: string): Promise<InterviewTemplate> {
    const template = await this.templateModel.findByIdAndUpdate(
      id,
      { $inc: { usageCount: 1 } },
      { new: true },
    );

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  /**
   * Rate a template
   */
  async rateTemplate(id: string, rating: number): Promise<InterviewTemplate> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const template = await this.templateModel.findById(id);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Calculate new average rating
    const newTotalRatings = template.totalRatings + 1;
    const newAverageRating = 
      (template.averageRating * template.totalRatings + rating) / newTotalRatings;

    return await this.templateModel.findByIdAndUpdate(
      id,
      {
        averageRating: Math.round(newAverageRating * 10) / 10, // Round to 1 decimal
        totalRatings: newTotalRatings,
      },
      { new: true },
    );
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(limit: number = 10): Promise<InterviewTemplate[]> {
    return await this.templateModel
      .find({ isPublic: true })
      .sort({ usageCount: -1, averageRating: -1 })
      .limit(limit)
      .populate('createdBy', 'name email')
      .exec();
  }

  /**
   * Get templates by user
   */
  async getUserTemplates(userId: string): Promise<InterviewTemplate[]> {
    return await this.templateModel
      .find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .exec();
  }

  /**
   * Duplicate a template
   */
  async duplicateTemplate(id: string, userId: string): Promise<InterviewTemplate> {
    const originalTemplate = await this.templateModel.findById(id);
    if (!originalTemplate) {
      throw new NotFoundException('Template not found');
    }

    const duplicatedTemplate = new this.templateModel({
      ...originalTemplate.toObject(),
      _id: undefined,
      name: `${originalTemplate.name} (Copy)`,
      createdBy: userId,
      usageCount: 0,
      averageRating: 0,
      totalRatings: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return await duplicatedTemplate.save();
  }

  /**
   * Get template statistics
   */
  async getTemplateStats(): Promise<{
    totalTemplates: number;
    publicTemplates: number;
    privateTemplates: number;
    totalUsage: number;
    averageRating: number;
  }> {
    const [
      totalTemplates,
      publicTemplates,
      privateTemplates,
      totalUsage,
      averageRating,
    ] = await Promise.all([
      this.templateModel.countDocuments(),
      this.templateModel.countDocuments({ isPublic: true }),
      this.templateModel.countDocuments({ isPublic: false }),
      this.templateModel.aggregate([
        { $group: { _id: null, total: { $sum: '$usageCount' } } },
      ]),
      this.templateModel.aggregate([
        { $group: { _id: null, avg: { $avg: '$averageRating' } } },
      ]),
    ]);

    return {
      totalTemplates,
      publicTemplates,
      privateTemplates,
      totalUsage: totalUsage[0]?.total || 0,
      averageRating: Math.round((averageRating[0]?.avg || 0) * 10) / 10,
    };
  }
}
