import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as csrf from 'csurf';

export const SKIP_CSRF_KEY = 'skipCsrf';

export const SkipCsrf = () => Reflector.createDecorator(SKIP_CSRF_KEY);

@Injectable()
export class CsrfGuard implements CanActivate {
  private csrfProtection = csrf({ cookie: true });

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if CSRF protection should be skipped
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCsrf) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only apply CSRF to state-changing methods
    const method = request.method;
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return true;
    }

    return new Promise((resolve, reject) => {
      this.csrfProtection(request, response, (err) => {
        if (err) {
          reject(new ForbiddenException('CSRF token mismatch'));
        } else {
          resolve(true);
        }
      });
    });
  }
}
