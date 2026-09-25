import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VisitRequestsService } from './visit-requests.service';
import { CreateVisitRequestDto } from './dto/create-visit-request.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Visit Requests')
@ApiBearerAuth('JWT-auth')
@Controller('visit-requests')
export class VisitRequestsController {
  constructor(private readonly visitRequestsService: VisitRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a site visit request for a listing' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVisitRequestDto,
  ) {
    return this.visitRequestsService.create(userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: "Get current user's sent visit requests" })
  findMine(@CurrentUser('id') userId: string) {
    return this.visitRequestsService.findByRequester(userId);
  }

  @Get('received')
  @ApiOperation({ summary: "Get visit requests received for user's listings" })
  findReceived(@CurrentUser('id') userId: string) {
    return this.visitRequestsService.findBySeller(userId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update visit request status (ACCEPTED/REJECTED/CANCELLED)' })
  updateStatus(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.visitRequestsService.updateStatus(userId, id, status);
  }
}
