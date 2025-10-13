import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';

@Injectable()
export class CustomRateLimitGuard implements CanActivate {
  private readonly requestCounts = new Map<string, { count: number; resetTime: number }>();

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = (request.user as any)?.id || request.ip;
    const routePath = request.route?.path || 'unknown';
    const key = `${routePath}:${userId}`;

    // Check for custom rate limit configuration
    const rateLimitOptions = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!rateLimitOptions) {
      return true; // No rate limiting configured
    }

    const { limit, ttl } = rateLimitOptions;
    const now = Date.now();

    // Get current request count for this key
    const current = this.requestCounts.get(key);
    
    if (!current || now > current.resetTime) {
      // First request or window expired
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + ttl,
      });
      return true;
    }

    if (current.count >= limit) {
      // Rate limit exceeded
      const remainingTime = Math.ceil((current.resetTime - now) / 1000);
      throw new HttpException(
        `Rate limit exceeded. Maximum ${limit} requests per ${ttl / 1000} seconds. Try again in ${remainingTime} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    current.count++;
    this.requestCounts.set(key, current);
    return true;
  }

  // Cleanup old entries periodically (could be called by a cron job)
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.requestCounts.entries()) {
      if (now > value.resetTime) {
        this.requestCounts.delete(key);
      }
    }
  }
}
