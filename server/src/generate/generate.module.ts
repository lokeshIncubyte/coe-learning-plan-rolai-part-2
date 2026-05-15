import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NarrativeGeneratorService } from './narrative-generator.service';
import { GraphService } from './graph.service';
import { StateService } from './state.service';
import { EngineService } from './engine.service';
import { GenerateController } from './generate.controller';
import { AgentsModule } from '../agents/agents.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, AgentsModule, PrismaModule],
  controllers: [GenerateController],
  providers: [NarrativeGeneratorService, GraphService, StateService, EngineService],
  exports: [NarrativeGeneratorService, GraphService, StateService, EngineService],
})
export class GenerateModule {}
