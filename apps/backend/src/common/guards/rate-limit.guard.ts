import { ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator';

@Injectable()
export class CustomRateLimitGuard extends ThrottlerGuard {
  constructor(reflector: Reflector) {
    super({}, reflector);
  }

  async handleRequest(context: ExecutionContext, limit: number, ttl: number): Promise<boolean> {
    const { req } = context.switchToHttp().getRequest();
    const userId = req.user?.id || req.ip; // Use user ID if authenticated, otherwise IP
    const key = `${req.route?.path || 'unknown'}:${userId}`;

    // Check custom rate limits first
    const customRateLimit = this.reflector.getAllAndOverride(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (customRateLimit) {
      const customLimit = await this.checkCustomRateLimit(key, customRateLimit);
      if (!customLimit) {
        throw new HttpException(
          `Rate limit exceeded. Maximum ${customRateLimit.limit} requests per ${customRateLimit.ttl / 1000} seconds.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Fall back to default throttling
    return super.handleRequest(context, limit, ttl);
  }

  private async checkCustomRateLimit(key: string, options: any): Promise<boolean> {
    // This would integrate with Redis or in-memory store
    // For now, we'll use a simple implementation
    const now = Date.now();
    const windowStart = now - options.ttl;
    
    // In a real implementation, you'd store this in Redis
    // For demo purposes, we'll assume it's working
    return true;
  }
}
