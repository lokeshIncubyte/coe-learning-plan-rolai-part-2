import { Global, Module } from '@nestjs/common';
import { GenerationHistoryService } from './generation-history.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [GenerationHistoryService],
  exports: [GenerationHistoryService],
})
export class HistoryModule {}
