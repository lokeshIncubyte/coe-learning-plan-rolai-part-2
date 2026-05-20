import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';
import { LoreUploadService } from './lore-upload.service';

@Module({
  imports: [MulterModule.register()],
  controllers: [UploadController],
  providers: [LoreUploadService],
})
export class UploadModule {}
