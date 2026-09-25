import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleName } from '../../common/enums';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform-wide statistics' })
  getStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('verifications/pending')
  @ApiOperation({ summary: 'Pending verification requests queue' })
  getPendingVerifications(@Query('limit') limit?: string) {
    return this.adminService.getPendingVerifications(limit ? parseInt(limit) : 10);
  }

  @Patch('verifications/:id/approve')
  @ApiOperation({ summary: 'Approve a verification request' })
  approveVerification(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
  ) {
    return this.adminService.reviewVerification(id, reviewerId, 'APPROVE');
  }

  @Patch('verifications/:id/reject')
  @ApiOperation({ summary: 'Reject a verification request' })
  rejectVerification(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.reviewVerification(id, reviewerId, 'REJECT', reason);
  }

  @Get('listings/pending')
  @ApiOperation({ summary: 'Pending listings review queue' })
  getPendingListings(@Query('limit') limit?: string) {
    return this.adminService.getPendingListings(limit ? parseInt(limit) : 10);
  }

  @Patch('listings/:id/approve')
  @ApiOperation({ summary: 'Approve and publish a listing' })
  approveListing(@Param('id') id: string) {
    return this.adminService.reviewListing(id, 'APPROVE');
  }

  @Patch('listings/:id/reject')
  @ApiOperation({ summary: 'Reject a listing' })
  rejectListing(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.adminService.reviewListing(id, 'REJECT', reason);
  }

  @Get('users')
  @ApiOperation({ summary: 'Paginated user list with search' })
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
    );
  }
}
