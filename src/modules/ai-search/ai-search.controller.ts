import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AiSearchService } from './ai-search.service';
import { AiSearchDto } from './dto/ai-search.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('search')
export class AiSearchController {
  constructor(private readonly aiSearchService: AiSearchService) {}

  @Public()
  @Post('ai')
  @HttpCode(HttpStatus.OK)
  async aiSearch(@Body() dto: AiSearchDto) {
    return this.aiSearchService.search(dto.query);
  }
}
