import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SupportTicket, SupportTicketDocument, TicketCategory, TicketPriority, TicketStatus } from './schemas/support-ticket.schema';

@Injectable()
export class PrioritySupportService {
  constructor(
    @InjectModel(SupportTicket.name) private supportTicketModel: Model<SupportTicketDocument>,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async createTicket(userId: string, ticketData: any): Promise<SupportTicket> {
    // Check if user has priority support access
    const subscription = await this.subscriptionsService.getUserSubscription(userId);
    if (!subscription || !this.hasPrioritySupportAccess(subscription.plan)) {
      throw new BadRequestException('Priority support requires Pro or Enterprise subscription');
    }

    // Determine priority based on subscription and category
    const priority = this.determinePriority(subscription.plan, ticketData.category, ticketData.priority);

    const ticket = new this.supportTicketModel({
      userId,
      ...ticketData,
      priority,
      metadata: {
        ...ticketData.metadata,
        source: 'web',
      },
    });

    return ticket.save();
  }

  async getTickets(userId: string, filters: any = {}): Promise<SupportTicket[]> {
    const query: any = { userId, isActive: true };
    
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.priority) {
      query.priority = filters.priority;
    }

    return this.supportTicketModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filters.limit || 50);
  }

  async getTicket(userId: string, ticketId: string): Promise<SupportTicket> {
    const ticket = await this.supportTicketModel.findOne({
      _id: ticketId,
      userId,
      isActive: true,
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    return ticket;
  }

  async updateTicket(userId: string, ticketId: string, updateData: any): Promise<SupportTicket> {
    const ticket = await this.supportTicketModel.findOneAndUpdate(
      { _id: ticketId, userId, isActive: true },
      updateData,
      { new: true }
    );

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    return ticket;
  }

  async addMessage(userId: string, ticketId: string, messageData: any): Promise<SupportTicket> {
    const ticket = await this.supportTicketModel.findOne({
      _id: ticketId,
      userId,
      isActive: true,
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    ticket.messages.push({
      senderId: userId,
      senderType: 'user',
      message: messageData.message,
      timestamp: new Date(),
      isInternal: false,
      attachments: messageData.attachments || [],
    });

    // Update status if it was waiting for customer
    if (ticket.status === TicketStatus.WAITING_FOR_CUSTOMER) {
      ticket.status = TicketStatus.IN_PROGRESS;
    }

    await ticket.save();
    return ticket;
  }

  async assignTicket(ticketId: string, agentId: string): Promise<SupportTicket> {
    const ticket = await this.supportTicketModel.findByIdAndUpdate(
      ticketId,
      {
        assignedTo: agentId,
        status: TicketStatus.IN_PROGRESS,
      },
      { new: true }
    );

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    return ticket;
  }

  async resolveTicket(ticketId: string, agentId: string): Promise<SupportTicket> {
    const ticket = await this.supportTicketModel.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    ticket.status = TicketStatus.RESOLVED;
    ticket.resolvedAt = new Date();
    ticket.assignedTo = agentId;

    // Calculate resolution time
    if ((ticket as any).createdAt) {
      ticket.resolutionTime = Math.floor(
        (ticket.resolvedAt.getTime() - (ticket as any).createdAt.getTime()) / (1000 * 60)
      );
    }

    await ticket.save();
    return ticket;
  }

  async closeTicket(ticketId: string, agentId: string): Promise<SupportTicket> {
    const ticket = await this.supportTicketModel.findByIdAndUpdate(
      ticketId,
      {
        status: TicketStatus.CLOSED,
        closedAt: new Date(),
        assignedTo: agentId,
      },
      { new: true }
    );

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    return ticket;
  }

  async rateTicket(userId: string, ticketId: string, rating: number, feedback?: string): Promise<SupportTicket> {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const ticket = await this.supportTicketModel.findOneAndUpdate(
      { _id: ticketId, userId, isActive: true },
      {
        satisfactionScore: rating,
        satisfactionFeedback: feedback,
      },
      { new: true }
    );

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    return ticket;
  }

  async escalateTicket(ticketId: string, escalatedTo: string, reason: string): Promise<SupportTicket> {
    const existingTicket = await this.supportTicketModel.findById(ticketId);
    const ticket = await this.supportTicketModel.findByIdAndUpdate(
      ticketId,
      {
        isEscalated: true,
        escalatedAt: new Date(),
        escalatedTo,
        priority: TicketPriority.CRITICAL,
        tags: [...(existingTicket?.tags || []), 'escalated'],
      },
      { new: true }
    );

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    return ticket;
  }

  async getTicketStats(userId: string): Promise<any> {
    const tickets = await this.supportTicketModel.find({ userId, isActive: true });
    
    const stats = {
      total: tickets.length,
      open: tickets.filter(t => t.status === TicketStatus.OPEN).length,
      inProgress: tickets.filter(t => t.status === TicketStatus.IN_PROGRESS).length,
      resolved: tickets.filter(t => t.status === TicketStatus.RESOLVED).length,
      closed: tickets.filter(t => t.status === TicketStatus.CLOSED).length,
      averageResolutionTime: 0,
      averageSatisfaction: 0,
    };

    const resolvedTickets = tickets.filter(t => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED);
    
    if (resolvedTickets.length > 0) {
      stats.averageResolutionTime = Math.round(
        resolvedTickets.reduce((sum, t) => sum + t.resolutionTime, 0) / resolvedTickets.length
      );
      
      const ratedTickets = resolvedTickets.filter(t => t.satisfactionScore > 0);
      if (ratedTickets.length > 0) {
        stats.averageSatisfaction = Number(
          (ratedTickets.reduce((sum, t) => sum + t.satisfactionScore, 0) / ratedTickets.length).toFixed(2)
        );
      }
    }

    return stats;
  }

  async getPrioritySupportInfo(userId: string): Promise<any> {
    const subscription = await this.subscriptionsService.getUserSubscription(userId);
    if (!subscription) {
      throw new NotFoundException('User subscription not found');
    }

    const plan = subscription.plan;
    const isEnterprise = plan === 'enterprise';
    const isPro = plan === 'pro';

    return {
      hasAccess: this.hasPrioritySupportAccess(plan),
      plan,
      features: {
        responseTime: isEnterprise ? '1 hour' : isPro ? '4 hours' : '24 hours',
        escalation: isEnterprise,
        dedicatedChannel: isEnterprise,
        phoneSupport: isEnterprise,
        videoSupport: isEnterprise,
        priorityQueue: isPro || isEnterprise,
        extendedHours: isEnterprise,
      },
      limits: {
        maxTicketsPerMonth: isEnterprise ? -1 : isPro ? 20 : 5,
        maxAttachmentsPerTicket: isEnterprise ? 10 : isPro ? 5 : 3,
        maxFileSize: isEnterprise ? '50MB' : isPro ? '25MB' : '10MB',
      },
    };
  }

  private determinePriority(plan: string, category: TicketCategory, userPriority?: TicketPriority): TicketPriority {
    // Enterprise customers get higher priority
    if (plan === 'enterprise') {
      if (userPriority === TicketPriority.CRITICAL || userPriority === TicketPriority.URGENT) {
        return userPriority;
      }
      if (category === TicketCategory.TECHNICAL || category === TicketCategory.BUG_REPORT) {
        return TicketPriority.HIGH;
      }
      return TicketPriority.MEDIUM;
    }

    // Pro customers get medium priority
    if (plan === 'pro') {
      if (userPriority === TicketPriority.CRITICAL) {
        return TicketPriority.URGENT;
      }
      if (userPriority === TicketPriority.URGENT) {
        return TicketPriority.HIGH;
      }
      return TicketPriority.MEDIUM;
    }

    // Free customers get lower priority
    return TicketPriority.LOW;
  }

  private hasPrioritySupportAccess(plan: string): boolean {
    return ['pro', 'enterprise'].includes(plan);
  }
}
