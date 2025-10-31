import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { UsersService } from '../users/users.service';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly usersService: UsersService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get public platform statistics' })
  async getPublicStats() {
    const stats = await this.publicService.getPublicStats();

    return {
      success: true,
      data: stats,
    };
  }

  @Get('resume/:id')
  @ApiOperation({ summary: 'Public resume view (HTML) by version id' })
  @Header('Content-Type', 'text/html')
  async publicResume(@Param('id') id: string) {
    const html = await this.usersService.renderResumeHtmlPublic(id);
    return html;
  }
}
