import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards
} from '@nestjs/common';
import { Role, Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BlockIpDto, IpBlockService, UnblockIpDto } from '../../common/services/ip-block.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

@Controller('admin/ip-management')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class IpManagementController {
  constructor(private readonly ipBlockService: IpBlockService) {}

  @Post('block')
  async blockIp(@Body() blockData: BlockIpDto, @Request() req: any) {
    try {
      // Ensure blockedBy is set to current user
      blockData.blockedBy = req.user.id;
      
      const blockedIp = await this.ipBlockService.blockIp(blockData);
      
      return {
        success: true,
        message: `IP ${blockData.ipAddress} has been blocked successfully`,
        data: blockedIp,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to block IP address',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('unblock')
  async unblockIp(@Body() unblockData: UnblockIpDto, @Request() req: any) {
    try {
      // Ensure unblockedBy is set to current user
      unblockData.unblockedBy = req.user.id;
      
      const unblockedIp = await this.ipBlockService.unblockIp(unblockData);
      
      return {
        success: true,
        message: `IP ${unblockData.ipAddress} has been unblocked successfully`,
        data: unblockedIp,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to unblock IP address',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('blocked-ips')
  async getBlockedIps(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('isActive') isActive?: string,
    @Query('blockType') blockType?: string,
    @Query('reason') reason?: string,
  ) {
    try {
      const result = await this.ipBlockService.getBlockedIps(
        parseInt(page),
        parseInt(limit),
        isActive ? isActive === 'true' : undefined,
        blockType as any,
        reason as any,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve blocked IPs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('blocked-ips/:ipAddress')
  async getBlockedIp(@Param('ipAddress') ipAddress: string) {
    try {
      const blockedIp = await this.ipBlockService.getBlockedIp(ipAddress);
      
      return {
        success: true,
        data: blockedIp,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve blocked IP information',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('statistics')
  async getBlockStatistics() {
    try {
      const statistics = await this.ipBlockService.getBlockStatistics();
      
      return {
        success: true,
        data: statistics,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve block statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('cleanup-expired')
  async cleanupExpiredBlocks() {
    try {
      const cleanedCount = await this.ipBlockService.cleanupExpiredBlocks();
      
      return {
        success: true,
        message: `${cleanedCount} expired blocks have been cleaned up`,
        data: { cleanedCount },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to cleanup expired blocks',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('check-ip')
  async checkIpStatus(@Body() body: { ipAddress: string }) {
    try {
      const isBlocked = await this.ipBlockService.isIpBlocked(body.ipAddress);
      
      return {
        success: true,
        data: {
          ipAddress: body.ipAddress,
          isBlocked,
        },
      };
    } catch (error) {
      throw new HttpException(
        'Failed to check IP status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('recent-activity')
  async getRecentActivityWithIps(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('userId') userId?: string,
  ) {
    try {
      console.log(`📡 Recent activity endpoint called: page=${page}, limit=${limit}, userId=${userId}`);
      
      const result = await this.ipBlockService.getRecentActivityWithIps(
        parseInt(page),
        parseInt(limit),
        userId,
      );

      console.log(`✅ Recent activity result:`, {
        activitiesCount: result.activities?.length || 0,
        ipGroupsCount: result.ipGroups?.length || 0,
        pagination: result.pagination
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('❌ Error in recent activity endpoint:', error);
      throw new HttpException(
        `Failed to retrieve recent activity: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user-ips/:userId')
  async getUserIps(@Param('userId') userId: string) {
    try {
      console.log(`📡 getUserIps endpoint called for userId: ${userId}`);
      
      const userIps = await this.ipBlockService.getUserIps(userId);
      
      console.log(`✅ getUserIps result:`, {
        userId,
        ipCount: userIps.length
      });
      
      return {
        success: true,
        data: userIps,
      };
    } catch (error) {
      console.error('❌ Error in getUserIps endpoint:', error);
      
      // Pass through the original error if it's already an HttpException
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        `Failed to retrieve user IP addresses: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('ip-users/:ipAddress')
  async getUsersByIp(@Param('ipAddress') ipAddress: string) {
    try {
      const users = await this.ipBlockService.getUsersByIp(ipAddress);
      
      return {
        success: true,
        data: users,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve users for IP address',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('search-users')
  async searchUsers(@Query('q') query: string) {
    try {
      console.log(`🔍 Searching users with query: ${query}`);
      
      if (!query || query.trim().length < 2) {
        return {
          success: true,
          data: { users: [] },
        };
      }

      const users = await this.ipBlockService.userModelAccess
        .find({
          $or: [
            { fullName: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
          ],
        })
        .select('_id fullName email role')
        .limit(10)
        .sort({ fullName: 1 });

      console.log(`👥 Found ${users.length} users matching "${query}"`);

      return {
        success: true,
        data: { users },
      };
    } catch (error) {
      console.error('❌ Error searching users:', error);
      throw new HttpException(
        `Failed to search users: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
