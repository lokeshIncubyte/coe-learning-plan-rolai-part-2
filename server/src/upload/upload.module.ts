import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config';
import { UploadController } from './upload.controller';
import { LoreUploadService } from './lore-upload.service';
import { ExtractorService } from './extractor.service';
import { GenerateModule } from '../generate/generate.module';
import { HistoryModule } from '../history/history.module';

@Module({
  imports: [MulterModule.register(), ConfigModule, GenerateModule, HistoryModule],
  controllers: [UploadController],
  providers: [LoreUploadService, ExtractorService],
})
export class UploadModule {}
