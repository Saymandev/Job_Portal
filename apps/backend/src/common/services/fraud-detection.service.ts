import { Injectable } from '@nestjs/common';
import { BlockReason } from '../schemas/blocked-ip.schema';
import { IpBlockService } from './ip-block.service';

export interface FraudDetectionConfig {
  maxFailedLogins: number;
  maxFailedLoginsWindow: number; // in milliseconds
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxFileUploadsPerHour: number;
  suspiciousPatterns: string[];
  autoBlockThreshold: number;
  autoBlockDuration: number; // in milliseconds
}

@Injectable()
export class FraudDetectionService {
  private readonly fraudAttempts = new Map<string, {
    failedLogins: { timestamp: number }[];
    requests: { timestamp: number; endpoint: string }[];
    fileUploads: { timestamp: number }[];
    suspiciousActivities: { timestamp: number; activity: string }[];
  }>();

  constructor(private readonly ipBlockService: IpBlockService) {}

  private readonly defaultConfig: FraudDetectionConfig = {
    maxFailedLogins: 5,
    maxFailedLoginsWindow: 15 * 60 * 1000, // 15 minutes
    maxRequestsPerMinute: 100,
    maxRequestsPerHour: 1000,
    maxFileUploadsPerHour: 20,
    suspiciousPatterns: [
      'sql injection',
      'xss',
      'script',
      'javascript:',
      'onclick',
      'onload',
      'eval(',
      'document.cookie',
      'window.location',
    ],
    autoBlockThreshold: 3,
    autoBlockDuration: 24 * 60 * 60 * 1000, // 24 hours
  };

  async detectFailedLogin(ipAddress: string, userAgent?: string): Promise<void> {
    if (!this.fraudAttempts.has(ipAddress)) {
      this.fraudAttempts.set(ipAddress, {
        failedLogins: [],
        requests: [],
        fileUploads: [],
        suspiciousActivities: [],
      });
    }

    const attempts = this.fraudAttempts.get(ipAddress);
    const now = Date.now();

    // Add failed login attempt
    attempts.failedLogins.push({ timestamp: now });

    // Clean old attempts
    this.cleanOldAttempts(ipAddress, now);

    // Check if threshold exceeded
    const recentFailedLogins = attempts.failedLogins.filter(
      attempt => now - attempt.timestamp <= this.defaultConfig.maxFailedLoginsWindow
    );

    if (recentFailedLogins.length >= this.defaultConfig.maxFailedLogins) {
      console.warn(`Multiple failed logins detected from IP: ${ipAddress}`);
      
      await this.ipBlockService.autoBlockIp(
        ipAddress,
        BlockReason.MULTIPLE_FAILED_LOGINS,
        {
          userAgent,
          failedLoginCount: recentFailedLogins.length,
          timeWindow: this.defaultConfig.maxFailedLoginsWindow,
        },
        new Date(Date.now() + this.defaultConfig.autoBlockDuration)
      );
    }
  }

  async detectSuspiciousRequest(ipAddress: string, endpoint: string, body?: any): Promise<boolean> {
    if (!this.fraudAttempts.has(ipAddress)) {
      this.fraudAttempts.set(ipAddress, {
        failedLogins: [],
        requests: [],
        fileUploads: [],
        suspiciousActivities: [],
      });
    }

    const attempts = this.fraudAttempts.get(ipAddress);
    const now = Date.now();

    // Add request
    attempts.requests.push({ timestamp: now, endpoint });

    // Clean old attempts
    this.cleanOldAttempts(ipAddress, now);

    // Check for suspicious patterns in request body
    let isSuspicious = false;
    if (body) {
      const bodyString = JSON.stringify(body).toLowerCase();
      for (const pattern of this.defaultConfig.suspiciousPatterns) {
        if (bodyString.includes(pattern.toLowerCase())) {
          isSuspicious = true;
          attempts.suspiciousActivities.push({
            timestamp: now,
            activity: `Suspicious pattern detected: ${pattern}`,
          });
          break;
        }
      }
    }

    // Check rate limits
    const recentRequests = attempts.requests.filter(
      req => now - req.timestamp <= 60 * 1000 // Last minute
    );

    if (recentRequests.length > this.defaultConfig.maxRequestsPerMinute) {
      isSuspicious = true;
      attempts.suspiciousActivities.push({
        timestamp: now,
        activity: `High request rate: ${recentRequests.length} requests per minute`,
      });
    }

    // Auto-block if too many suspicious activities
    if (attempts.suspiciousActivities.length >= this.defaultConfig.autoBlockThreshold) {
      console.warn(`Suspicious activity detected from IP: ${ipAddress}`);
      
      await this.ipBlockService.autoBlockIp(
        ipAddress,
        BlockReason.SUSPICIOUS_ACTIVITY,
        {
          suspiciousActivities: attempts.suspiciousActivities,
          requestCount: attempts.requests.length,
        },
        new Date(Date.now() + this.defaultConfig.autoBlockDuration)
      );
    }

    return isSuspicious;
  }

  async detectSuspiciousFileUpload(ipAddress: string, filename: string, fileSize: number): Promise<boolean> {
    if (!this.fraudAttempts.has(ipAddress)) {
      this.fraudAttempts.set(ipAddress, {
        failedLogins: [],
        requests: [],
        fileUploads: [],
        suspiciousActivities: [],
      });
    }

    const attempts = this.fraudAttempts.get(ipAddress);
    const now = Date.now();

    // Add file upload
    attempts.fileUploads.push({ timestamp: now });

    // Clean old attempts
    this.cleanOldAttempts(ipAddress, now);

    let isSuspicious = false;

    // Check file upload rate
    const recentUploads = attempts.fileUploads.filter(
      upload => now - upload.timestamp <= 60 * 60 * 1000 // Last hour
    );

    if (recentUploads.length > this.defaultConfig.maxFileUploadsPerHour) {
      isSuspicious = true;
      attempts.suspiciousActivities.push({
        timestamp: now,
        activity: `High file upload rate: ${recentUploads.length} uploads per hour`,
      });
    }

    // Check for suspicious filename patterns
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.vbs', '.js'];
    const fileExtension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    if (suspiciousExtensions.includes(fileExtension)) {
      isSuspicious = true;
      attempts.suspiciousActivities.push({
        timestamp: now,
        activity: `Suspicious file type: ${fileExtension}`,
      });
    }

    // Check for suspicious filename patterns
    const suspiciousPatterns = ['virus', 'malware', 'trojan', 'keylogger', 'backdoor'];
    const lowerFilename = filename.toLowerCase();
    
    for (const pattern of suspiciousPatterns) {
      if (lowerFilename.includes(pattern)) {
        isSuspicious = true;
        attempts.suspiciousActivities.push({
          timestamp: now,
          activity: `Suspicious filename pattern: ${pattern}`,
        });
        break;
      }
    }

    // Check file size (very large files might be suspicious)
    if (fileSize > 50 * 1024 * 1024) { // 50MB
      isSuspicious = true;
      attempts.suspiciousActivities.push({
        timestamp: now,
        activity: `Unusually large file: ${(fileSize / 1024 / 1024).toFixed(2)}MB`,
      });
    }

    // Auto-block if too many suspicious activities
    if (attempts.suspiciousActivities.length >= this.defaultConfig.autoBlockThreshold) {
      console.warn(`Suspicious file upload activity detected from IP: ${ipAddress}`);
      
      await this.ipBlockService.autoBlockIp(
        ipAddress,
        BlockReason.MALICIOUS_UPLOADS,
        {
          suspiciousActivities: attempts.suspiciousActivities,
          uploadCount: attempts.fileUploads.length,
          lastFilename: filename,
          lastFileSize: fileSize,
        },
        new Date(Date.now() + this.defaultConfig.autoBlockDuration)
      );
    }

    return isSuspicious;
  }

  async detectSpamActivity(ipAddress: string, content: string, activity: string): Promise<boolean> {
    if (!this.fraudAttempts.has(ipAddress)) {
      this.fraudAttempts.set(ipAddress, {
        failedLogins: [],
        requests: [],
        fileUploads: [],
        suspiciousActivities: [],
      });
    }

    const attempts = this.fraudAttempts.get(ipAddress);
    const now = Date.now();

    let isSpam = false;

    // Check for spam patterns
    const spamPatterns = [
      'buy now',
      'click here',
      'free money',
      'get rich quick',
      'viagra',
      'casino',
      'lottery winner',
      'congratulations',
      'urgent',
      'limited time',
      'act now',
    ];

    const lowerContent = content.toLowerCase();
    let spamScore = 0;

    for (const pattern of spamPatterns) {
      if (lowerContent.includes(pattern)) {
        spamScore++;
      }
    }

    // Check for excessive repetition
    const words = content.split(' ');
    const wordCounts = new Map<string, number>();
    
    for (const word of words) {
      const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
      if (cleanWord.length > 3) {
        wordCounts.set(cleanWord, (wordCounts.get(cleanWord) || 0) + 1);
      }
    }

    const maxRepetition = Math.max(...wordCounts.values());
    if (maxRepetition > words.length * 0.3) { // More than 30% repetition
      spamScore += 2;
    }

    // Check for excessive capitalization
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.7) { // More than 70% caps
      spamScore += 1;
    }

    if (spamScore >= 3) {
      isSpam = true;
      attempts.suspiciousActivities.push({
        timestamp: now,
        activity: `Spam detected in ${activity}: score ${spamScore}`,
      });

      // Auto-block for spam
      await this.ipBlockService.autoBlockIp(
        ipAddress,
        BlockReason.SPAM,
        {
          spamScore,
          activity,
          content: content.substring(0, 200), // First 200 chars
          suspiciousActivities: attempts.suspiciousActivities,
        },
        new Date(Date.now() + this.defaultConfig.autoBlockDuration)
      );
    }

    return isSpam;
  }

  private cleanOldAttempts(ipAddress: string, now: number): void {
    const attempts = this.fraudAttempts.get(ipAddress);
    if (!attempts) return;

    const maxAge = 60 * 60 * 1000; // 1 hour

    attempts.failedLogins = attempts.failedLogins.filter(
      attempt => now - attempt.timestamp <= maxAge
    );
    attempts.requests = attempts.requests.filter(
      request => now - request.timestamp <= maxAge
    );
    attempts.fileUploads = attempts.fileUploads.filter(
      upload => now - upload.timestamp <= maxAge
    );
    attempts.suspiciousActivities = attempts.suspiciousActivities.filter(
      activity => now - activity.timestamp <= maxAge
    );
  }

  getFraudAttempts(ipAddress: string): any {
    return this.fraudAttempts.get(ipAddress) || null;
  }

  clearFraudAttempts(ipAddress: string): void {
    this.fraudAttempts.delete(ipAddress);
  }

  // Cleanup old entries periodically
  cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [ipAddress, attempts] of this.fraudAttempts.entries()) {
      const hasRecentActivity = [
        ...attempts.failedLogins,
        ...attempts.requests,
        ...attempts.fileUploads,
        ...attempts.suspiciousActivities,
      ].some(activity => now - activity.timestamp <= maxAge);

      if (!hasRecentActivity) {
        this.fraudAttempts.delete(ipAddress);
      }
    }
  }
}
