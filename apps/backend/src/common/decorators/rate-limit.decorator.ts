import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  ttl: number; // Time window in milliseconds
  limit: number; // Number of requests allowed
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean; // Skip counting failed requests
}

export const RATE_LIMIT_KEY = 'rateLimit';

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
