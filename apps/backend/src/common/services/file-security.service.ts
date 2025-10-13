import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { readFileSync, statSync } from 'fs';
import { extname } from 'path';

export interface FileScanResult {
  isSafe: boolean;
  fileType: string;
  fileSize: number;
  checksum: string;
  threats: string[];
  scanDetails: {
    scannedAt: Date;
    scanDuration: number;
    engineVersion: string;
  };
}

@Injectable()
export class FileSecurityService {
  private readonly ALLOWED_EXTENSIONS = [
    '.pdf', '.doc', '.docx', '.txt', '.rtf',
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.zip', '.rar'
  ];

  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly DANGEROUS_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr',
    '.vbs', '.js', '.jar', '.php', '.asp', '.aspx'
  ];

  private readonly MALICIOUS_PATTERNS = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /eval\(/i,
    /document\.write/i,
    /window\.location/i
  ];

  /**
   * Comprehensive file security scan
   */
  async scanFile(filePath: string, originalName: string): Promise<FileScanResult> {
    const startTime = Date.now();
    const threats: string[] = [];

    try {
      // Basic file validation
      const fileStats = statSync(filePath);
      const fileSize = fileStats.size;
      const fileExtension = extname(originalName).toLowerCase();

      // Check file size
      if (fileSize > this.MAX_FILE_SIZE) {
        threats.push(`File size exceeds maximum allowed size (${this.MAX_FILE_SIZE / 1024 / 1024}MB)`);
      }

      // Check file extension
      if (this.DANGEROUS_EXTENSIONS.includes(fileExtension)) {
        threats.push(`Dangerous file extension: ${fileExtension}`);
      }

      if (!this.ALLOWED_EXTENSIONS.includes(fileExtension)) {
        threats.push(`Unsupported file extension: ${fileExtension}`);
      }

      // Read file content for scanning
      const fileContent = readFileSync(filePath);
      
      // Generate checksum
      const checksum = createHash('sha256').update(fileContent).digest('hex');

      // Content-based scanning
      await this.scanFileContent(fileContent, threats);

      // MIME type validation
      await this.validateMimeType(fileContent, fileExtension, threats);

      // Heuristic analysis
      await this.performHeuristicAnalysis(fileContent, threats);

      const scanDuration = Date.now() - startTime;

      return {
        isSafe: threats.length === 0,
        fileType: this.getFileType(fileExtension),
        fileSize,
        checksum,
        threats,
        scanDetails: {
          scannedAt: new Date(),
          scanDuration,
          engineVersion: '1.0.0'
        }
      };

    } catch (error) {
      const scanDuration = Date.now() - startTime;
      
      return {
        isSafe: false,
        fileType: 'unknown',
        fileSize: 0,
        checksum: '',
        threats: [`File scan error: ${error.message}`],
        scanDetails: {
          scannedAt: new Date(),
          scanDuration,
          engineVersion: '1.0.0'
        }
      };
    }
  }

  /**
   * Scan file content for malicious patterns
   */
  private async scanFileContent(content: Buffer, threats: string[]): Promise<void> {
    const contentStr = content.toString('utf8', 0, Math.min(content.length, 1024 * 1024)); // Scan first 1MB

    // Check for malicious patterns
    for (const pattern of this.MALICIOUS_PATTERNS) {
      if (pattern.test(contentStr)) {
        threats.push(`Malicious pattern detected: ${pattern.source}`);
      }
    }

    // Check for embedded executables
    if (content.includes(Buffer.from([0x4D, 0x5A]))) { // MZ header (PE executable)
      threats.push('Embedded executable detected');
    }

    // Check for suspicious entropy (high randomness might indicate encryption/packing)
    const entropy = this.calculateEntropy(content);
    if (entropy > 7.5) {
      threats.push('High entropy detected - possible packed/encrypted content');
    }
  }

  /**
   * Validate MIME type against file extension
   */
  private async validateMimeType(content: Buffer, extension: string, threats: string[]): Promise<void> {
    const mimeType = this.detectMimeType(content);
    const expectedMimeTypes = this.getExpectedMimeTypes(extension);

    if (mimeType && !expectedMimeTypes.includes(mimeType)) {
      threats.push(`MIME type mismatch: expected ${expectedMimeTypes.join(' or ')}, got ${mimeType}`);
    }
  }

  /**
   * Perform heuristic analysis
   */
  private async performHeuristicAnalysis(content: Buffer, threats: string[]): Promise<void> {
    // Check for suspicious file signatures
    const signatures = this.getFileSignatures(content);
    
    for (const signature of signatures) {
      if (signature.suspicious) {
        threats.push(`Suspicious file signature: ${signature.description}`);
      }
    }

    // Check for embedded URLs (potential phishing)
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const contentStr = content.toString('utf8', 0, Math.min(content.length, 1024 * 1024));
    const urls = contentStr.match(urlPattern);
    
    if (urls && urls.length > 10) {
      threats.push('High number of URLs detected - possible phishing attempt');
    }
  }

  /**
   * Calculate file entropy
   */
  private calculateEntropy(buffer: Buffer): number {
    const freq = new Array(256).fill(0);
    for (const byte of buffer) {
      freq[byte]++;
    }

    let entropy = 0;
    const length = buffer.length;
    
    for (const count of freq) {
      if (count > 0) {
        const p = count / length;
        entropy -= p * Math.log2(p);
      }
    }
    
    return entropy;
  }

  /**
   * Detect MIME type from file content
   */
  private detectMimeType(content: Buffer): string | null {
    const signatures: { [key: string]: Buffer } = {
      'application/pdf': Buffer.from([0x25, 0x50, 0x44, 0x46]),
      'image/jpeg': Buffer.from([0xFF, 0xD8, 0xFF]),
      'image/png': Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
      'application/zip': Buffer.from([0x50, 0x4B, 0x03, 0x04]),
      'application/msword': Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]),
    };

    for (const [mimeType, signature] of Object.entries(signatures)) {
      if (content.subarray(0, signature.length).equals(signature)) {
        return mimeType;
      }
    }

    return null;
  }

  /**
   * Get expected MIME types for file extension
   */
  private getExpectedMimeTypes(extension: string): string[] {
    const mimeMap: { [key: string]: string[] } = {
      '.pdf': ['application/pdf'],
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.png': ['image/png'],
      '.gif': ['image/gif'],
      '.txt': ['text/plain'],
      '.doc': ['application/msword'],
      '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      '.zip': ['application/zip'],
    };

    return mimeMap[extension] || [];
  }

  /**
   * Get file type category
   */
  private getFileType(extension: string): string {
    const typeMap: { [key: string]: string } = {
      '.pdf': 'document',
      '.doc': 'document',
      '.docx': 'document',
      '.txt': 'document',
      '.rtf': 'document',
      '.jpg': 'image',
      '.jpeg': 'image',
      '.png': 'image',
      '.gif': 'image',
      '.webp': 'image',
      '.zip': 'archive',
      '.rar': 'archive',
    };

    return typeMap[extension] || 'unknown';
  }

  /**
   * Get file signatures for analysis
   */
  private getFileSignatures(content: Buffer): Array<{ suspicious: boolean; description: string }> {
    const signatures = [];

    // Check for PE executable signature
    if (content.subarray(0, 2).equals(Buffer.from([0x4D, 0x5A]))) {
      signatures.push({ suspicious: true, description: 'PE Executable signature' });
    }

    // Check for ELF executable signature
    if (content.subarray(0, 4).equals(Buffer.from([0x7F, 0x45, 0x4C, 0x46]))) {
      signatures.push({ suspicious: true, description: 'ELF Executable signature' });
    }

    // Check for Mach-O executable signature
    if (content.subarray(0, 4).equals(Buffer.from([0xFE, 0xED, 0xFA, 0xCE]))) {
      signatures.push({ suspicious: true, description: 'Mach-O Executable signature' });
    }

    return signatures;
  }

  /**
   * Validate file name
   */
  sanitizeFileName(fileName: string): string {
    if (!fileName) return '';

    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars
      .replace(/\.{2,}/g, '.') // Replace multiple dots
      .replace(/^\./, '') // Remove leading dot
      .substring(0, 255); // Limit length
  }

  /**
   * Check if file extension is allowed
   */
  isAllowedExtension(extension: string): boolean {
    return this.ALLOWED_EXTENSIONS.includes(extension.toLowerCase());
  }

  /**
   * Check if file size is within limits
   */
  isFileSizeAllowed(size: number): boolean {
    return size <= this.MAX_FILE_SIZE;
  }
}
