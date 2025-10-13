import { Injectable } from '@nestjs/common';

@Injectable()
export class SanitizationService {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  sanitizeHtml(html: string): string {
    if (!html) return '';
    
    // Basic HTML sanitization without DOMPurify
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/<[^>]*>/g, (match) => {
        // Allow only specific tags
        const allowedTags = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        const tagMatch = match.match(/<\/?(\w+)/);
        if (tagMatch && allowedTags.includes(tagMatch[1].toLowerCase())) {
          return match.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, ''); // Remove event handlers from allowed tags
        }
        return '';
      });
  }

  /**
   * Sanitize plain text to prevent injection attacks
   */
  sanitizeText(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Sanitize job description and requirements
   */
  sanitizeJobContent(content: string): string {
    if (!content) return '';
    
    // First sanitize HTML
    const sanitizedHtml = this.sanitizeHtml(content);
    
    // Then apply additional text sanitization
    return this.sanitizeText(sanitizedHtml);
  }

  /**
   * Validate and sanitize file names
   */
  sanitizeFileName(fileName: string): string {
    if (!fileName) return '';
    
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
      .replace(/^\./, '') // Remove leading dot
      .substring(0, 255); // Limit length
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sanitize object properties recursively
   */
  sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeText(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[this.sanitizeText(key)] = this.sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  }
}
