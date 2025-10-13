import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CoverLetterTemplate, CoverLetterTemplateDocument } from './schemas/cover-letter-template.schema';

@Injectable()
export class CoverLetterTemplatesService {
  constructor(
    @InjectModel(CoverLetterTemplate.name)
    private coverLetterTemplateModel: Model<CoverLetterTemplateDocument>,
  ) {}

  async create(
    userId: string,
    name: string,
    content: string,
    isDefault: boolean = false,
    tags?: string[],
  ): Promise<CoverLetterTemplateDocument> {
    // If setting as default, unset other defaults
    if (isDefault) {
      await this.coverLetterTemplateModel.updateMany(
        { userId, isDefault: true },
        { isDefault: false },
      );
    }

    const template = await this.coverLetterTemplateModel.create({
      userId,
      name,
      content,
      isDefault,
      tags: tags || [],
      usageCount: 0,
    });

    return template;
  }

  async findAll(userId: string): Promise<CoverLetterTemplateDocument[]> {
    return this.coverLetterTemplateModel
      .find({ userId })
      .sort({ isDefault: -1, usageCount: -1, createdAt: -1 })
      .exec();
  }

  async findById(userId: string, templateId: string): Promise<CoverLetterTemplateDocument> {
    const template = await this.coverLetterTemplateModel.findOne({
      _id: templateId,
      userId,
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async findDefault(userId: string): Promise<CoverLetterTemplateDocument | null> {
    return this.coverLetterTemplateModel.findOne({ userId, isDefault: true }).exec();
  }

  async update(
    userId: string,
    templateId: string,
    name?: string,
    content?: string,
    isDefault?: boolean,
    tags?: string[],
  ): Promise<CoverLetterTemplateDocument> {
    // If setting as default, unset other defaults
    if (isDefault) {
      await this.coverLetterTemplateModel.updateMany(
        { userId, isDefault: true, _id: { $ne: templateId } },
        { isDefault: false },
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (content !== undefined) updateData.content = content;
    if (isDefault !== undefined) updateData.isDefault = isDefault;
    if (tags !== undefined) updateData.tags = tags;

    const template = await this.coverLetterTemplateModel.findOneAndUpdate(
      { _id: templateId, userId },
      updateData,
      { new: true },
    );

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async delete(userId: string, templateId: string): Promise<void> {
    const result = await this.coverLetterTemplateModel.deleteOne({
      _id: templateId,
      userId,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Template not found');
    }
  }

  async incrementUsageCount(templateId: string): Promise<void> {
    await this.coverLetterTemplateModel.findByIdAndUpdate(templateId, {
      $inc: { usageCount: 1 },
      lastUsedAt: new Date(),
    });
  }

  async generateTemplateWithPlaceholders(
    userId: string,
    jobTitle: string,
    companyName: string,
    templateContent?: string,
  ): Promise<string> {
    // Use provided template or default
    let content = templateContent;
    
    if (!content) {
      const defaultTemplate = await this.findDefault(userId);
      content = defaultTemplate?.content || this.getDefaultTemplate();
    }

    // Replace placeholders
    return content
      .replace(/\{job_title\}/gi, jobTitle)
      .replace(/\{company_name\}/gi, companyName)
      .replace(/\{date\}/gi, new Date().toLocaleDateString())
      .replace(/\{year\}/gi, new Date().getFullYear().toString());
  }

  private getDefaultTemplate(): string {
    return `Dear Hiring Manager,

I am writing to express my strong interest in the {job_title} position at {company_name}. With my experience and skills, I believe I would be a valuable addition to your team.

Throughout my career, I have developed expertise in relevant technologies and best practices. I am particularly drawn to {company_name} because of your innovative approach and commitment to excellence.

I am excited about the opportunity to contribute to your team and would welcome the chance to discuss how my background and skills would benefit {company_name}.

Thank you for considering my application. I look forward to the opportunity to speak with you.

Best regards`;
  }
}

