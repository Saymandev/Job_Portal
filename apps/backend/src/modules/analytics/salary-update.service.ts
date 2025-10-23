import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SalaryDataService } from './salary-data.service';

@Injectable()
export class SalaryUpdateService {
  private readonly logger = new Logger(SalaryUpdateService.name);
  private readonly updateQueue = new Set<string>();
  private isUpdating = false;

  constructor(private salaryDataService: SalaryDataService) {}

  /**
   * Daily salary data update - runs at 2 AM every day
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async updateSalaryData() {
    if (this.isUpdating) {
      this.logger.warn('Salary data update already in progress, skipping...');
      return;
    }

    this.isUpdating = true;
    this.logger.log('Starting daily salary data update...');

    try {
      // Clear cache to force fresh data
      this.salaryDataService.clearCache();
      
      // Update popular job positions and locations
      const popularPositions = [
        'Software Engineer',
        'Data Scientist',
        'Product Manager',
        'DevOps Engineer',
        'Full Stack Developer',
        'Frontend Developer',
        'Backend Developer',
        'Mobile Developer',
        'UI/UX Designer',
        'Marketing Manager',
      ];

      const popularLocations = [
        'San Francisco',
        'New York',
        'Seattle',
        'Austin',
        'Denver',
        'Chicago',
        'Boston',
        'Los Angeles',
        'Remote',
        'London',
      ];

      const experienceLevels = ['Entry-level', 'Mid-level', 'Senior-level', 'Executive'];

      let updatedCount = 0;
      const totalCombinations = popularPositions.length * popularLocations.length * experienceLevels.length;

      this.logger.log(`Updating salary data for ${totalCombinations} combinations...`);

      for (const position of popularPositions) {
        for (const location of popularLocations) {
          for (const experienceLevel of experienceLevels) {
            try {
              await this.salaryDataService.getSalaryData({
                position,
                location,
                experienceLevel,
              });
              updatedCount++;
              
              // Log progress every 50 updates
              if (updatedCount % 50 === 0) {
                this.logger.log(`Updated ${updatedCount}/${totalCombinations} salary data points...`);
              }
            } catch (error) {
              this.logger.error(`Failed to update salary data for ${position} in ${location} (${experienceLevel}):`, error.message);
            }
          }
        }
      }

      // Update market analysis
      try {
        await this.salaryDataService.getMarketAnalysis();
        this.logger.log('Market analysis updated successfully');
      } catch (error) {
        this.logger.error('Failed to update market analysis:', error.message);
      }

      this.logger.log(`Salary data update completed. Updated ${updatedCount}/${totalCombinations} data points.`);
    } catch (error) {
      this.logger.error('Salary data update failed:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Weekly comprehensive update - runs every Sunday at 3 AM
   */
  @Cron('0 3 * * 0') // Every Sunday at 3 AM
  async comprehensiveUpdate() {
    this.logger.log('Starting weekly comprehensive salary data update...');
    
    try {
      // Clear all caches
      this.salaryDataService.clearCache();
      
      // Force update of all cached data
      await this.updateSalaryData();
      
      // Additional comprehensive updates can be added here
      // e.g., industry-specific updates, regional updates, etc.
      
      this.logger.log('Weekly comprehensive update completed');
    } catch (error) {
      this.logger.error('Weekly comprehensive update failed:', error);
    }
  }

  /**
   * Manual trigger for salary data update
   */
  async triggerUpdate(): Promise<{ success: boolean; message: string }> {
    if (this.isUpdating) {
      return {
        success: false,
        message: 'Salary data update is already in progress',
      };
    }

    try {
      await this.updateSalaryData();
      return {
        success: true,
        message: 'Salary data update triggered successfully',
      };
    } catch (error) {
      this.logger.error('Manual salary data update failed:', error);
      return {
        success: false,
        message: `Salary data update failed: ${error.message}`,
      };
    }
  }

  /**
   * Update specific position/location combination
   */
  async updateSpecificData(position: string, location: string, experienceLevel: string): Promise<void> {
    const cacheKey = `salary_${position}_${location}_${experienceLevel}`;
    
    try {
      // Remove from cache to force fresh data
      this.salaryDataService.clearCache();
      
      // Fetch fresh data
      await this.salaryDataService.getSalaryData({
        position,
        location,
        experienceLevel,
      });
      
      this.logger.log(`Updated salary data for ${position} in ${location} (${experienceLevel})`);
    } catch (error) {
      this.logger.error(`Failed to update specific salary data:`, error);
      throw error;
    }
  }

  /**
   * Get update status
   */
  getUpdateStatus(): {
    isUpdating: boolean;
    queueSize: number;
    lastUpdate?: Date;
  } {
    return {
      isUpdating: this.isUpdating,
      queueSize: this.updateQueue.size,
      lastUpdate: this.isUpdating ? undefined : new Date(), // In real implementation, store actual last update time
    };
  }

  /**
   * Clear all caches manually
   */
  clearAllCaches(): void {
    this.salaryDataService.clearCache();
    this.updateQueue.clear();
    this.logger.log('All salary data caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics(): any {
    return this.salaryDataService.getCacheStats();
  }
}
