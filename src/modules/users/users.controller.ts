import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService, UpdateUserDto } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  async getMe(@CurrentUser('id') userId: string) {
    const user = await this.usersService.findByIdOrThrow(userId);
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profileImageUrl: user.profileImageUrl,
      status: user.status,
      emailVerified: user.emailVerified,
      roles: user.roles?.map((r) => r.name) ?? [],
      createdAt: user.createdAt,
    };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user basic info' })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.usersService.updateMe(userId, dto);
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      profileImageUrl: user.profileImageUrl,
      status: user.status,
      emailVerified: user.emailVerified,
      roles: user.roles?.map((r) => r.name) ?? [],
    };
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get current user listing stats for dashboard' })
  async getMyStats(@CurrentUser('id') userId: string) {
    return this.usersService.getDashboardStats(userId);
  }
}
