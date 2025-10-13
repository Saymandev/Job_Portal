import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicService } from './public.service';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get public platform statistics' })
  async getPublicStats() {
    const stats = await this.publicService.getPublicStats();

    return {
      success: true,
      data: stats,
    };
  }
}
