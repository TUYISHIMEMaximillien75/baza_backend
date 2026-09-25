import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfilesService, UpdateProfileDto } from './profiles.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Profiles')
@ApiBearerAuth('JWT-auth')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile details' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    const profile = await this.profilesService.findByUserId(userId);
    return profile ?? {};
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profilesService.upsertProfile(userId, dto);
  }
}
