import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
// Simple CSV parser implementation
import * as fs from 'fs';
import { Model } from 'mongoose';
import { JobsService } from '../jobs/jobs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { BulkImport, BulkImportDocument, BulkImportStatus } from './schemas/bulk-import.schema';

interface JobImportData {
  title: string;
  description: string;
  location: string;
  type: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  requirements: string;
  benefits?: string;
  department?: string;
  experienceLevel?: string;
  remote?: boolean;
  urgent?: boolean;
  featured?: boolean;
}

@Injectable()
export class BulkImportService {
  constructor(
    @InjectModel(BulkImport.name) private bulkImportModel: Model<BulkImportDocument>,
    private jobsService: JobsService,
    private subscriptionsService: SubscriptionsService,
    private notificationsService: NotificationsService,
  ) {}

  async createBulkImport(
    userId: string,
    fileName: string,
    originalFileName: string,
    filePath: string,
  ): Promise<BulkImport> {
    // Check if user has bulk import access
    const subscription = await this.subscriptionsService.getUserSubscription(userId);
    if (!subscription || !this.hasBulkImportAccess(subscription.plan)) {
      throw new BadRequestException('Bulk job import requires Pro or Enterprise subscription');
    }

    const bulkImport = new this.bulkImportModel({
      user: userId,
      fileName,
      originalFileName,
      filePath,
      status: BulkImportStatus.PENDING,
    });

    return bulkImport.save();
  }

  async processBulkImport(importId: string): Promise<void> {
    const bulkImport = await this.bulkImportModel.findById(importId);
    if (!bulkImport) {
      throw new NotFoundException('Bulk import not found');
    }

    bulkImport.status = BulkImportStatus.PROCESSING;
    await bulkImport.save();

    // Send notification that import has started
    await this.notificationsService.createNotification({
      user: bulkImport.user,
      title: '📊 Bulk Import Started',
      message: `Your bulk import "${bulkImport.originalFileName}" has started processing. You will be notified when it's complete.`,
      type: 'info',
      actionUrl: '/settings/bulk-import',
      metadata: {
        importId: bulkImport._id.toString(),
        fileName: bulkImport.originalFileName,
        totalJobs: bulkImport.totalJobs,
      },
    });

    try {
      const results = await this.parseAndValidateCSV(bulkImport.filePath);
      bulkImport.totalJobs = results.length;

      const errors: Array<{
        row: number;
        field: string;
        message: string;
        value?: any;
      }> = [];
      const successfulJobIds: string[] = [];
      let successfulJobs = 0;
      let failedJobs = 0;

      for (let i = 0; i < results.length; i++) {
        const jobData = results[i];
        try {
          const jobResult = await this.jobsService.create(bulkImport.user, {
            title: jobData.title,
            description: jobData.description,
            requirements: jobData.requirements,
            location: jobData.location,
            isRemote: jobData.remote || false,
            jobType: jobData.type as any,
            experienceLevel: jobData.experienceLevel as any || 'mid',
            salaryMin: jobData.salaryMin,
            salaryMax: jobData.salaryMax,
            currency: jobData.currency || 'USD',
            skills: jobData.requirements.split(',').map(s => s.trim()),
            benefits: jobData.benefits ? jobData.benefits.split(',').map(b => b.trim()) : [],
          });
          successfulJobIds.push(jobResult.job._id.toString());
          successfulJobs++;
        } catch (error: any) {
          errors.push({
            row: i + 2, // +2 because CSV has header row and arrays are 0-indexed
            field: 'general',
            message: error.message,
            value: jobData,
          });
          failedJobs++;
        }
        bulkImport.processedJobs = i + 1;
        await bulkImport.save();
      }

      bulkImport.successfulJobs = successfulJobs;
      bulkImport.failedJobs = failedJobs;
      bulkImport.errors = errors as any;
      bulkImport.successfulJobIds = successfulJobIds;
      bulkImport.completedAt = new Date();

      if (failedJobs === 0) {
        bulkImport.status = BulkImportStatus.COMPLETED;
        
        // Send success notification
        await this.notificationsService.createNotification({
          user: bulkImport.user,
          title: '✅ Bulk Import Completed Successfully',
          message: `All ${successfulJobs} jobs from "${bulkImport.originalFileName}" have been imported successfully!`,
          type: 'success',
          actionUrl: '/settings/bulk-import',
          metadata: {
            importId: bulkImport._id.toString(),
            fileName: bulkImport.originalFileName,
            successfulJobs,
            failedJobs: 0,
          },
        });
      } else if (successfulJobs === 0) {
        bulkImport.status = BulkImportStatus.FAILED;
        bulkImport.errorMessage = 'All jobs failed to import';
        
        // Send failure notification
        await this.notificationsService.createNotification({
          user: bulkImport.user,
          title: '❌ Bulk Import Failed',
          message: `All jobs from "${bulkImport.originalFileName}" failed to import. Please check your CSV format and try again.`,
          type: 'error',
          actionUrl: '/settings/bulk-import',
          metadata: {
            importId: bulkImport._id.toString(),
            fileName: bulkImport.originalFileName,
            successfulJobs: 0,
            failedJobs,
            errors: errors.slice(0, 5), // Include first 5 errors
          },
        });
      } else {
        bulkImport.status = BulkImportStatus.PARTIALLY_COMPLETED;
        
        // Send partial success notification
        await this.notificationsService.createNotification({
          user: bulkImport.user,
          title: '⚠️ Bulk Import Partially Completed',
          message: `${successfulJobs} jobs imported successfully, ${failedJobs} failed from "${bulkImport.originalFileName}". Check the details for more information.`,
          type: 'warning',
          actionUrl: '/settings/bulk-import',
          metadata: {
            importId: bulkImport._id.toString(),
            fileName: bulkImport.originalFileName,
            successfulJobs,
            failedJobs,
            errors: errors.slice(0, 5), // Include first 5 errors
          },
        });
      }

      await bulkImport.save();
    } catch (error: any) {
      bulkImport.status = BulkImportStatus.FAILED;
      bulkImport.errorMessage = error.message;
      await bulkImport.save();
      
      // Send error notification
      await this.notificationsService.createNotification({
        user: bulkImport.user,
        title: '❌ Bulk Import Error',
        message: `Bulk import "${bulkImport.originalFileName}" failed due to an error: ${error.message}`,
        type: 'error',
        actionUrl: '/settings/bulk-import',
        metadata: {
          importId: bulkImport._id.toString(),
          fileName: bulkImport.originalFileName,
          error: error.message,
        },
      });
    }
  }

  async getBulkImports(userId: string): Promise<BulkImport[]> {
    return this.bulkImportModel
      .find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);
  }

  async getBulkImport(userId: string, importId: string): Promise<BulkImport> {
    const bulkImport = await this.bulkImportModel.findOne({
      _id: importId,
      user: userId,
    });

    if (!bulkImport) {
      throw new NotFoundException('Bulk import not found');
    }

    return bulkImport;
  }

  async deleteBulkImport(userId: string, importId: string): Promise<void> {
    const bulkImport = await this.bulkImportModel.findOne({
      _id: importId,
      user: userId,
    });

    if (!bulkImport) {
      throw new NotFoundException('Bulk import not found');
    }

    // Delete the file
    if (fs.existsSync(bulkImport.filePath)) {
      fs.unlinkSync(bulkImport.filePath);
    }

    await this.bulkImportModel.findByIdAndDelete(importId);
  }

  async getCSVTemplate(): Promise<Buffer> {
    const headers = [
      'title',
      'description',
      'location',
      'type',
      'salaryMin',
      'salaryMax',
      'currency',
      'requirements',
      'benefits',
      'department',
      'experienceLevel',
      'remote',
      'urgent',
      'featured',
    ];

    const sampleData = [
      [
        'Senior Software Engineer',
        'We are looking for a talented software engineer to join our team...',
        'San Francisco, CA',
        'full-time',
        '80000',
        '120000',
        'USD',
        '5+ years experience, React, Node.js, TypeScript',
        'Health insurance, 401k, flexible hours',
        'Engineering',
        'senior',
        'true',
        'false',
        'false',
      ],
    ];

    const csvContent = [headers, ...sampleData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return Buffer.from(csvContent, 'utf-8');
  }

  private async parseAndValidateCSV(filePath: string): Promise<JobImportData[]> {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row');
      }

      const headers = this.parseCSVLine(lines[0]);
      const results: JobImportData[] = [];
      const errors: Array<{
        row: number;
        field: string;
        message: string;
        value?: any;
      }> = [];

      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        const data: any = {};
        
        headers.forEach((header, index) => {
          data[header] = values[index] || '';
        });

        try {
          const validatedData = this.validateJobData(data);
          results.push(validatedData);
        } catch (error: any) {
          errors.push({
            row: i + 1, // +1 for 1-based row numbering
            field: 'validation',
            message: error.message,
            value: data,
          });
        }
      }

      if (errors.length > 0) {
        throw new Error(`Validation errors found: ${errors.length} errors`);
      }

      return results;
    } catch (error: any) {
      throw new Error(`Failed to parse CSV: ${error.message}`);
    }
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private validateJobData(data: any): JobImportData {
    const requiredFields = ['title', 'description', 'location', 'type', 'requirements'];
    
    for (const field of requiredFields) {
      if (!data[field] || data[field].trim() === '') {
        throw new Error(`Required field '${field}' is missing or empty`);
      }
    }

    // Validate job type
    const validTypes = ['full-time', 'part-time', 'contract', 'internship', 'temporary'];
    if (!validTypes.includes(data.type.toLowerCase())) {
      throw new Error(`Invalid job type '${data.type}'. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate experience level
    if (data.experienceLevel) {
      const validLevels = ['entry', 'mid', 'senior', 'lead', 'executive'];
      if (!validLevels.includes(data.experienceLevel.toLowerCase())) {
        throw new Error(`Invalid experience level '${data.experienceLevel}'. Must be one of: ${validLevels.join(', ')}`);
      }
    }

    // Validate salary
    if (data.salaryMin && isNaN(Number(data.salaryMin))) {
      throw new Error('Salary minimum must be a number');
    }
    if (data.salaryMax && isNaN(Number(data.salaryMax))) {
      throw new Error('Salary maximum must be a number');
    }
    if (data.salaryMin && data.salaryMax && Number(data.salaryMin) > Number(data.salaryMax)) {
      throw new Error('Salary minimum cannot be greater than maximum');
    }

    // Validate boolean fields
    const booleanFields = ['remote', 'urgent', 'featured'];
    for (const field of booleanFields) {
      if (data[field] && !['true', 'false', '1', '0', 'yes', 'no'].includes(data[field].toLowerCase())) {
        throw new Error(`Field '${field}' must be true/false, yes/no, or 1/0`);
      }
    }

    return {
      title: data.title.trim(),
      description: data.description.trim(),
      location: data.location.trim(),
      type: data.type.toLowerCase(),
      salaryMin: data.salaryMin ? Number(data.salaryMin) : undefined,
      salaryMax: data.salaryMax ? Number(data.salaryMax) : undefined,
      currency: data.currency || 'USD',
      requirements: data.requirements.trim(),
      benefits: data.benefits?.trim(),
      department: data.department?.trim(),
      experienceLevel: data.experienceLevel?.toLowerCase(),
      remote: this.parseBoolean(data.remote),
      urgent: this.parseBoolean(data.urgent),
      featured: this.parseBoolean(data.featured),
    };
  }

  private parseBoolean(value: any): boolean {
    if (!value) return false;
    const str = String(value).toLowerCase();
    return ['true', '1', 'yes'].includes(str);
  }

  private hasBulkImportAccess(plan: string): boolean {
    return ['pro', 'enterprise'].includes(plan);
  }
}
