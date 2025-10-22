import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AccountManager, AccountManagerDocument, AccountManagerStatus } from './schemas/account-manager.schema';
import { AssignmentStatus, ClientAssignment, ClientAssignmentDocument } from './schemas/client-assignment.schema';

@Injectable()
export class AccountManagersService {
  constructor(
    @InjectModel(AccountManager.name) private accountManagerModel: Model<AccountManagerDocument>,
    @InjectModel(ClientAssignment.name) private clientAssignmentModel: Model<ClientAssignmentDocument>,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async createAccountManager(accountManagerData: Partial<AccountManager>): Promise<AccountManager> {
    const accountManager = new this.accountManagerModel(accountManagerData);
    return accountManager.save();
  }

  async getAccountManagers(): Promise<AccountManager[]> {
    return this.accountManagerModel.find({ isActive: true }).sort({ name: 1 });
  }

  async getAccountManager(managerId: string): Promise<AccountManager> {
    const manager = await this.accountManagerModel.findById(managerId);
    if (!manager) {
      throw new NotFoundException('Account manager not found');
    }
    return manager;
  }

  async updateAccountManager(managerId: string, updateData: Partial<AccountManager>): Promise<AccountManager> {
    const manager = await this.accountManagerModel.findByIdAndUpdate(
      managerId,
      updateData,
      { new: true }
    );
    if (!manager) {
      throw new NotFoundException('Account manager not found');
    }
    return manager;
  }

  async deleteAccountManager(managerId: string): Promise<void> {
    const manager = await this.accountManagerModel.findById(managerId);
    if (!manager) {
      throw new NotFoundException('Account manager not found');
    }

    // Check if manager has active clients
    const activeAssignments = await this.clientAssignmentModel.countDocuments({
      accountManagerId: managerId,
      status: AssignmentStatus.ACTIVE,
    });

    if (activeAssignments > 0) {
      throw new BadRequestException('Cannot delete account manager with active client assignments');
    }

    manager.isActive = false;
    await manager.save();
  }

  async assignClientToManager(clientId: string, managerId: string, assignedBy: string): Promise<ClientAssignment> {
    // Check if client has enterprise subscription
    const subscription = await this.subscriptionsService.getUserSubscription(clientId);
    if (!subscription || !this.hasDedicatedSupportAccess(subscription.plan)) {
      throw new BadRequestException('Dedicated account manager requires Enterprise subscription');
    }

    // Check if client already has an active assignment
    const existingAssignment = await this.clientAssignmentModel.findOne({
      clientId,
      status: AssignmentStatus.ACTIVE,
    });

    if (existingAssignment) {
      throw new BadRequestException('Client already has an active account manager assignment');
    }

    // Check if manager has capacity
    const manager = await this.accountManagerModel.findById(managerId);
    if (!manager) {
      throw new NotFoundException('Account manager not found');
    }

    if (manager.currentClients >= manager.maxClients) {
      throw new BadRequestException('Account manager has reached maximum client capacity');
    }

    const assignment = new this.clientAssignmentModel({
      clientId,
      accountManagerId: managerId,
      assignedBy,
      assignedAt: new Date(),
    });

    await assignment.save();

    // Update manager's current client count
    manager.currentClients += 1;
    manager.assignedClients.push(clientId);
    await manager.save();

    return assignment;
  }

  async getClientAssignment(clientId: string): Promise<ClientAssignment | null> {
    return this.clientAssignmentModel
      .findOne({ clientId, status: AssignmentStatus.ACTIVE })
      .populate('accountManagerId');
  }

  async getManagerClients(managerId: string): Promise<ClientAssignment[]> {
    return this.clientAssignmentModel
      .find({ accountManagerId: managerId, status: AssignmentStatus.ACTIVE })
      .populate('clientId');
  }

  async transferClient(clientId: string, newManagerId: string, transferredBy: string): Promise<ClientAssignment> {
    const assignment = await this.clientAssignmentModel.findOne({
      clientId,
      status: AssignmentStatus.ACTIVE,
    });

    if (!assignment) {
      throw new NotFoundException('No active assignment found for this client');
    }

    const oldManagerId = assignment.accountManagerId.toString();
    const newManager = await this.accountManagerModel.findById(newManagerId);
    if (!newManager) {
      throw new NotFoundException('New account manager not found');
    }

    if (newManager.currentClients >= newManager.maxClients) {
      throw new BadRequestException('New account manager has reached maximum client capacity');
    }

    // Update assignment
    assignment.status = AssignmentStatus.TRANSFERRED;
    assignment.transferredAt = new Date();
    assignment.transferredTo = newManagerId;
    await assignment.save();

    // Create new assignment
    const newAssignment = new this.clientAssignmentModel({
      clientId,
      accountManagerId: newManagerId,
      assignedBy: transferredBy,
      assignedAt: new Date(),
      notes: `Transferred from previous manager`,
    });

    await newAssignment.save();

    // Update manager counts
    const oldManager = await this.accountManagerModel.findById(oldManagerId);
    if (oldManager) {
      oldManager.currentClients -= 1;
      oldManager.assignedClients = oldManager.assignedClients.filter(id => id !== clientId);
      await oldManager.save();
    }

    newManager.currentClients += 1;
    newManager.assignedClients.push(clientId);
    await newManager.save();

    return newAssignment;
  }

  async updateAssignment(assignmentId: string, updateData: Partial<ClientAssignment>): Promise<ClientAssignment> {
    const assignment = await this.clientAssignmentModel.findByIdAndUpdate(
      assignmentId,
      updateData,
      { new: true }
    );
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }
    return assignment;
  }

  async addInteraction(assignmentId: string, interaction: any): Promise<ClientAssignment> {
    const assignment = await this.clientAssignmentModel.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    assignment.interactions.push({
      ...interaction,
      date: new Date(),
    });
    assignment.totalInteractions += 1;
    assignment.lastInteractionAt = new Date();
    await assignment.save();

    return assignment;
  }

  async getManagerStats(managerId: string): Promise<any> {
    const manager = await this.accountManagerModel.findById(managerId);
    if (!manager) {
      throw new NotFoundException('Account manager not found');
    }

    const assignments = await this.clientAssignmentModel.find({
      accountManagerId: managerId,
      status: AssignmentStatus.ACTIVE,
    });

    const totalInteractions = assignments.reduce((sum, assignment) => sum + assignment.totalInteractions, 0);
    const avgSatisfaction = assignments.length > 0 
      ? assignments.reduce((sum, assignment) => sum + assignment.clientSatisfactionScore, 0) / assignments.length
      : 0;

    return {
      manager,
      totalClients: assignments.length,
      totalInteractions,
      averageSatisfaction: avgSatisfaction,
      capacity: {
        current: manager.currentClients,
        max: manager.maxClients,
        available: manager.maxClients - manager.currentClients,
      },
    };
  }

  async getAvailableManagers(): Promise<AccountManager[]> {
    return this.accountManagerModel.find({
      isActive: true,
      status: AccountManagerStatus.ACTIVE,
      $expr: { $lt: ['$currentClients', '$maxClients'] },
    }).sort({ currentClients: 1 });
  }

  async autoAssignClient(clientId: string, assignedBy: string): Promise<ClientAssignment> {
    const availableManagers = await this.getAvailableManagers();
    
    if (availableManagers.length === 0) {
      throw new BadRequestException('No available account managers');
    }

    // Assign to manager with least clients
    const manager = availableManagers[0];
    return this.assignClientToManager(clientId, (manager as any)._id.toString(), assignedBy);
  }

  private hasDedicatedSupportAccess(plan: string): boolean {
    return plan === 'enterprise';
  }
}
