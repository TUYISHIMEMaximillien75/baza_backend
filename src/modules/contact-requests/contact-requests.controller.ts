import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContactRequestsService } from './contact-requests.service';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Contact Requests')
@Controller('contact-requests')
export class ContactRequestsController {
  constructor(private readonly contactRequestsService: ContactRequestsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Send a contact request to a listing owner' })
  create(
    @CurrentUser('id') userId: string | null,
    @Body() dto: CreateContactRequestDto,
  ) {
    return this.contactRequestsService.create(userId, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Get('received')
  @ApiOperation({ summary: 'Get contact requests received for your listings' })
  findReceived(@CurrentUser('id') userId: string) {
    return this.contactRequestsService.findReceived(userId);
  }
}
