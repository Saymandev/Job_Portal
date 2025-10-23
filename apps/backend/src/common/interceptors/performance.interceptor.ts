import {
    CallHandler,
    ExecutionContext,
    Injectable,
    Logger,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MonitoringService } from '../services/monitoring.service';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  constructor(private monitoringService: MonitoringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const { method, url, route } = request;
    const endpoint = route?.path || url;

    this.monitoringService.addBreadcrumb(
      `Request started: ${method} ${endpoint}`,
      'http',
      'info',
      { method, endpoint, url }
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.monitoringService.monitorApiCall(
            endpoint,
            method,
            statusCode,
            duration
          );

          this.logger.log(
            `${method} ${endpoint} - ${statusCode} - ${duration}ms`
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode || 500;

          this.monitoringService.monitorApiCall(
            endpoint,
            method,
            statusCode,
            duration
          );

          this.monitoringService.captureError(error, {
            endpoint,
            method,
            duration,
            statusCode,
          });

          this.logger.error(
            `${method} ${endpoint} - ${statusCode} - ${duration}ms - Error: ${error.message}`
          );
        },
      })
    );
  }
}
