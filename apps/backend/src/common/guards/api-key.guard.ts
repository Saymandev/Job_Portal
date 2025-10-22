import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('API key required');
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
    const keyRecord = await this.apiKeysService.validateApiKey(apiKey);

    if (!keyRecord) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Add user and API key info to request
    request.user = { id: keyRecord.user };
    request.apiKey = keyRecord;

    return true;
  }
}
