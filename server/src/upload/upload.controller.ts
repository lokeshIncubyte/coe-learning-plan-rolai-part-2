import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LoreUploadService } from './lore-upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly loreUploadService: LoreUploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    const text = await this.loreUploadService.processUpload(file.buffer, file.mimetype);
    const chunks = this.loreUploadService.chunkIntoUnits(text);
    return this.loreUploadService.extractAndPersist(chunks);
  }
}
