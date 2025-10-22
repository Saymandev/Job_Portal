import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Role, Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountManagersService } from './account-managers.service';
import { AddInteractionDto } from './dto/add-interaction.dto';
import { AssignClientDto } from './dto/assign-client.dto';
import { CreateAccountManagerDto } from './dto/create-account-manager.dto';
import { UpdateAccountManagerDto } from './dto/update-account-manager.dto';

@ApiTags('Account Managers')
@Controller('account-managers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AccountManagersController {
  constructor(private readonly accountManagersService: AccountManagersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new account manager (Admin only)' })
  async createAccountManager(@Body() createAccountManagerDto: CreateAccountManagerDto) {
    const accountManager = await this.accountManagersService.createAccountManager(createAccountManagerDto as any);

    return {
      success: true,
      message: 'Account manager created successfully',
      data: accountManager,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all account managers' })
  async getAccountManagers() {
    const accountManagers = await this.accountManagersService.getAccountManagers();

    return {
      success: true,
      data: accountManagers,
    };
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available account managers for assignment' })
  async getAvailableManagers() {
    const managers = await this.accountManagersService.getAvailableManagers();

    return {
      success: true,
      data: managers,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specific account manager' })
  async getAccountManager(@Param('id') id: string) {
    const accountManager = await this.accountManagersService.getAccountManager(id);

    return {
      success: true,
      data: accountManager,
    };
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update account manager (Admin only)' })
  async updateAccountManager(
    @Param('id') id: string,
    @Body() updateAccountManagerDto: UpdateAccountManagerDto,
  ) {
    const accountManager = await this.accountManagersService.updateAccountManager(id, updateAccountManagerDto as any);

    return {
      success: true,
      message: 'Account manager updated successfully',
      data: accountManager,
    };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete account manager (Admin only)' })
  async deleteAccountManager(@Param('id') id: string) {
    await this.accountManagersService.deleteAccountManager(id);

    return {
      success: true,
      message: 'Account manager deleted successfully',
    };
  }

  @Post('assign')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Assign client to account manager (Admin only)' })
  async assignClient(
    @Body() assignClientDto: AssignClientDto,
    @CurrentUser('id') assignedBy: string,
  ) {
    const assignment = await this.accountManagersService.assignClientToManager(
      assignClientDto.clientId,
      assignClientDto.accountManagerId,
      assignedBy,
    );

    return {
      success: true,
      message: 'Client assigned to account manager successfully',
      data: assignment,
    };
  }

  @Post('auto-assign')
  @Roles(Role.EMPLOYER, Role.ADMIN)
  @ApiOperation({ summary: 'Auto-assign client to available manager' })
  async autoAssignClient(
    @Body('clientId') clientId: string,
    @CurrentUser('id') assignedBy: string,
  ) {
    const assignment = await this.accountManagersService.autoAssignClient(clientId, assignedBy);

    return {
      success: true,
      message: 'Client auto-assigned to account manager successfully',
      data: assignment,
    };
  }

  @Get('client/me')
  @Roles(Role.EMPLOYER)
  @ApiOperation({ summary: 'Get current user client assignment' })
  async getMyClientAssignment(@CurrentUser('id') userId: string) {
    const assignment = await this.accountManagersService.getClientAssignment(userId);

    return {
      success: true,
      data: assignment,
    };
  }

  @Get('client/:clientId')
  @ApiOperation({ summary: 'Get client assignment' })
  async getClientAssignment(@Param('clientId') clientId: string) {
    const assignment = await this.accountManagersService.getClientAssignment(clientId);

    return {
      success: true,
      data: assignment,
    };
  }

  @Get('manager/:managerId/clients')
  @ApiOperation({ summary: 'Get manager clients' })
  async getManagerClients(@Param('managerId') managerId: string) {
    const clients = await this.accountManagersService.getManagerClients(managerId);

    return {
      success: true,
      data: clients,
    };
  }

  @Post('transfer')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Transfer client to different manager (Admin only)' })
  async transferClient(
    @Body('clientId') clientId: string,
    @Body('newManagerId') newManagerId: string,
    @CurrentUser('id') transferredBy: string,
  ) {
    const assignment = await this.accountManagersService.transferClient(
      clientId,
      newManagerId,
      transferredBy,
    );

    return {
      success: true,
      message: 'Client transferred successfully',
      data: assignment,
    };
  }

  @Post('interaction/:assignmentId')
  @ApiOperation({ summary: 'Add interaction to assignment' })
  async addInteraction(
    @Param('assignmentId') assignmentId: string,
    @Body() addInteractionDto: AddInteractionDto,
  ) {
    const assignment = await this.accountManagersService.addInteraction(assignmentId, addInteractionDto);

    return {
      success: true,
      message: 'Interaction added successfully',
      data: assignment,
    };
  }

  @Get('stats/:managerId')
  @ApiOperation({ summary: 'Get manager statistics' })
  async getManagerStats(@Param('managerId') managerId: string) {
    const stats = await this.accountManagersService.getManagerStats(managerId);

    return {
      success: true,
      data: stats,
    };
  }
}
