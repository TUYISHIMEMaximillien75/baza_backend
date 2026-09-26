import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadedFile {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class UploadsService {
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Save a single uploaded file locally and return access URL
   */
  async saveFile(file: UploadedFile, hostUrl?: string): Promise<{ url: string; filename: string; size: number }> {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    // Validate mime type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.');
    }

    // Maximum size: 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds maximum limit of 10MB.');
    }

    const ext = path.extname(file.originalname) || '.jpg';
    const randomName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext.toLowerCase()}`;
    const filePath = path.join(this.uploadDir, randomName);

    await fs.promises.writeFile(filePath, file.buffer);

    // Build public URL
    const baseUrl = hostUrl || this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/uploads/${randomName}`;

    return {
      url,
      filename: randomName,
      size: file.size,
    };
  }

  /**
   * Save multiple uploaded files
   */
  async saveMultipleFiles(files: UploadedFile[], hostUrl?: string): Promise<{ url: string; filename: string; size: number }[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No image files provided');
    }
    const savedFiles = [];
    for (const file of files) {
      const saved = await this.saveFile(file, hostUrl);
      savedFiles.push(saved);
    }
    return savedFiles;
  }
}
