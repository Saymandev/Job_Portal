import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role, Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrioritySupportService } from './priority-support.service';

@ApiTags('Priority Support')
@Controller('priority-support')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PrioritySupportController {
  constructor(private readonly prioritySupportService: PrioritySupportService) {}

  @Get('info')
  @ApiOperation({ summary: 'Get priority support information for user' })
  async getPrioritySupportInfo(@CurrentUser('id') userId: string) {
    const info = await this.prioritySupportService.getPrioritySupportInfo(userId);

    return {
      success: true,
      data: info,
    };
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Create a new support ticket' })
  async createTicket(
    @CurrentUser('id') userId: string,
    @Body() ticketData: any,
  ) {
    const ticket = await this.prioritySupportService.createTicket(userId, ticketData);

    return {
      success: true,
      message: 'Support ticket created successfully',
      data: ticket,
    };
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Get user support tickets' })
  async getTickets(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('priority') priority?: string,
    @Query('limit') limit?: number,
  ) {
    const tickets = await this.prioritySupportService.getTickets(userId, {
      status,
      category,
      priority,
      limit,
    });

    return {
      success: true,
      data: tickets,
    };
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get specific support ticket' })
  async getTicket(
    @CurrentUser('id') userId: string,
    @Param('id') ticketId: string,
  ) {
    const ticket = await this.prioritySupportService.getTicket(userId, ticketId);

    return {
      success: true,
      data: ticket,
    };
  }

  @Put('tickets/:id')
  @ApiOperation({ summary: 'Update support ticket' })
  async updateTicket(
    @CurrentUser('id') userId: string,
    @Param('id') ticketId: string,
    @Body() updateData: any,
  ) {
    const ticket = await this.prioritySupportService.updateTicket(userId, ticketId, updateData);

    return {
      success: true,
      message: 'Ticket updated successfully',
      data: ticket,
    };
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Add message to support ticket' })
  async addMessage(
    @CurrentUser('id') userId: string,
    @Param('id') ticketId: string,
    @Body() messageData: any,
  ) {
    const ticket = await this.prioritySupportService.addMessage(userId, ticketId, messageData);

    return {
      success: true,
      message: 'Message added successfully',
      data: ticket,
    };
  }

  @Post('tickets/:id/rate')
  @ApiOperation({ summary: 'Rate support ticket' })
  async rateTicket(
    @CurrentUser('id') userId: string,
    @Param('id') ticketId: string,
    @Body('rating') rating: number,
    @Body('feedback') feedback?: string,
  ) {
    const ticket = await this.prioritySupportService.rateTicket(userId, ticketId, rating, feedback);

    return {
      success: true,
      message: 'Ticket rated successfully',
      data: ticket,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user support ticket statistics' })
  async getTicketStats(@CurrentUser('id') userId: string) {
    const stats = await this.prioritySupportService.getTicketStats(userId);

    return {
      success: true,
      data: stats,
    };
  }

  // Admin/Agent endpoints
  @Post('tickets/:id/assign')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @ApiOperation({ summary: 'Assign ticket to agent (Admin/Agent only)' })
  async assignTicket(
    @Param('id') ticketId: string,
    @Body('agentId') agentId: string,
  ) {
    const ticket = await this.prioritySupportService.assignTicket(ticketId, agentId);

    return {
      success: true,
      message: 'Ticket assigned successfully',
      data: ticket,
    };
  }

  @Post('tickets/:id/resolve')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @ApiOperation({ summary: 'Resolve support ticket (Admin/Agent only)' })
  async resolveTicket(
    @Param('id') ticketId: string,
    @CurrentUser('id') agentId: string,
  ) {
    const ticket = await this.prioritySupportService.resolveTicket(ticketId, agentId);

    return {
      success: true,
      message: 'Ticket resolved successfully',
      data: ticket,
    };
  }

  @Post('tickets/:id/close')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @ApiOperation({ summary: 'Close support ticket (Admin/Agent only)' })
  async closeTicket(
    @Param('id') ticketId: string,
    @CurrentUser('id') agentId: string,
  ) {
    const ticket = await this.prioritySupportService.closeTicket(ticketId, agentId);

    return {
      success: true,
      message: 'Ticket closed successfully',
      data: ticket,
    };
  }

  @Post('tickets/:id/escalate')
  @Roles(Role.ADMIN, Role.EMPLOYER)
  @ApiOperation({ summary: 'Escalate support ticket (Admin/Agent only)' })
  async escalateTicket(
    @Param('id') ticketId: string,
    @Body('escalatedTo') escalatedTo: string,
    @Body('reason') reason: string,
  ) {
    const ticket = await this.prioritySupportService.escalateTicket(ticketId, escalatedTo, reason);

    return {
      success: true,
      message: 'Ticket escalated successfully',
      data: ticket,
    };
  }
}
