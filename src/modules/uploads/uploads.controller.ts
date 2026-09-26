import {
  Controller,
  Post,
  UploadedFile as NestUploadedFile,
  UploadedFiles as NestUploadedFiles,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { UploadsService, UploadedFile } from './uploads.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Public()
  @Post('single')
  @ApiOperation({ summary: 'Upload a single image file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, WEBP, GIF - max 10MB)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadSingleFile(
    @NestUploadedFile() file: UploadedFile,
    @Req() req: Request,
  ) {
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    return this.uploadsService.saveFile(file, hostUrl);
  }

  @Public()
  @Post('multiple')
  @ApiOperation({ summary: 'Upload up to 10 image files' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Array of image files (max 10 files, 10MB each)',
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleFiles(
    @NestUploadedFiles() files: UploadedFile[],
    @Req() req: Request,
  ) {
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    return this.uploadsService.saveMultipleFiles(files, hostUrl);
  }
}
