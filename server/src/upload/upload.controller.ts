import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LoreUploadService } from './lore-upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import type { Multer } from 'multer';

type MulterFile = Express.Multer.File;

@Controller('upload')
export class UploadController {
  constructor(private readonly loreUploadService: LoreUploadService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: MulterFile) {
    if (!file) throw new BadRequestException('No file provided')
    const text = await this.loreUploadService.processUpload(file.buffer, file.mimetype);
    const chunks = this.loreUploadService.chunkIntoUnits(text);
    return this.loreUploadService.extractAndPersist(chunks);
  }
}
