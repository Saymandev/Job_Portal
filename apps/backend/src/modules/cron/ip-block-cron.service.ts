import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FraudDetectionService } from '../../common/services/fraud-detection.service';
import { IpBlockService } from '../../common/services/ip-block.service';

@Injectable()
export class IpBlockCronService {
  private readonly logger = new Logger(IpBlockCronService.name);

  constructor(
    private readonly ipBlockService: IpBlockService,
    private readonly fraudDetectionService: FraudDetectionService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredBlocks() {
    try {
      this.logger.log('Starting cleanup of expired IP blocks...');
      
      const cleanedCount = await this.ipBlockService.cleanupExpiredBlocks();
      
      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} expired IP blocks`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up expired IP blocks:', error);
    }
  }

  @Cron(CronExpression.EVERY_4_HOURS)
  async cleanupFraudDetectionData() {
    try {
      this.logger.log('Starting cleanup of fraud detection data...');
      
      this.fraudDetectionService.cleanup();
      
      this.logger.log('Completed cleanup of fraud detection data');
    } catch (error) {
      this.logger.error('Error cleaning up fraud detection data:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyIpBlockReport() {
    try {
      this.logger.log('Generating daily IP block report...');
      
      const statistics = await this.ipBlockService.getBlockStatistics();
      
      this.logger.log('Daily IP Block Report:', {
        totalBlocks: statistics.totalBlocks,
        activeBlocks: statistics.activeBlocks,
        recentBlocks: statistics.recentBlocks,
        blocksByReason: statistics.blocksByReason,
        blocksByType: statistics.blocksByType,
      });
    } catch (error) {
      this.logger.error('Error generating daily IP block report:', error);
    }
  }
}
