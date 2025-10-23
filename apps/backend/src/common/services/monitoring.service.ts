import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor() {
    // Initialize Sentry
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 1.0,
      debug: false,
      environment: process.env.NODE_ENV || 'development',
    });
  }

  /**
   * Capture and report errors
   */
  captureError(error: Error, context?: any) {
    this.logger.error('Error captured:', error.message, error.stack);
    
    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional', context);
      }
      Sentry.captureException(error);
    });
  }

  /**
   * Capture and report messages
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: any) {
    this.logger.log(`Message captured (${level}):`, message);
    
    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext('additional', context);
      }
      scope.setLevel(level);
      Sentry.captureMessage(message);
    });
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category: string, level: 'info' | 'warning' | 'error' = 'info', data?: any) {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Set user context for error tracking
   */
  setUserContext(user: { id: string; email: string; role: string }) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }

  /**
   * Set tags for filtering
   */
  setTag(key: string, value: string) {
    Sentry.setTag(key, value);
  }

  /**
   * Set extra context
   */
  setExtra(key: string, value: any) {
    Sentry.setExtra(key, value);
  }

  /**
   * Create a transaction for performance monitoring
   */
  startTransaction(name: string, op: string) {
    return Sentry.startSpan({
      name,
      op,
    }, () => {});
  }

  /**
   * Capture performance metrics
   */
  capturePerformance(operation: string, duration: number, context?: any) {
    this.addBreadcrumb(
      `Performance: ${operation} took ${duration}ms`,
      'performance',
      'info',
      { operation, duration, ...context }
    );
  }

  /**
   * Monitor API calls
   */
  monitorApiCall(endpoint: string, method: string, statusCode: number, duration: number) {
    this.addBreadcrumb(
      `API Call: ${method} ${endpoint} - ${statusCode}`,
      'api',
      statusCode >= 400 ? 'error' : 'info',
      { endpoint, method, statusCode, duration }
    );

    if (statusCode >= 400) {
      this.captureMessage(
        `API Error: ${method} ${endpoint} returned ${statusCode}`,
        'error',
        { endpoint, method, statusCode, duration }
      );
    }
  }

  /**
   * Monitor database operations
   */
  monitorDatabaseOperation(operation: string, collection: string, duration: number, success: boolean) {
    this.addBreadcrumb(
      `DB Operation: ${operation} on ${collection} - ${success ? 'success' : 'failed'}`,
      'database',
      success ? 'info' : 'error',
      { operation, collection, duration, success }
    );

    if (!success) {
      this.captureMessage(
        `Database Error: ${operation} on ${collection} failed`,
        'error',
        { operation, collection, duration }
      );
    }
  }

  /**
   * Monitor external API calls
   */
  monitorExternalApi(service: string, endpoint: string, success: boolean, duration: number, error?: string) {
    this.addBreadcrumb(
      `External API: ${service} ${endpoint} - ${success ? 'success' : 'failed'}`,
      'external-api',
      success ? 'info' : 'error',
      { service, endpoint, success, duration, error }
    );

    if (!success) {
      this.captureMessage(
        `External API Error: ${service} ${endpoint} failed`,
        'error',
        { service, endpoint, duration, error }
      );
    }
  }

  /**
   * Flush pending events
   */
  async flush(timeout: number = 2000) {
    return Sentry.flush(timeout);
  }
}
