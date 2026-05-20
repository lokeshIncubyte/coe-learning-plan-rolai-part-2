import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NarrativeGeneratorService } from './narrative-generator.service';
import { GraphService } from './graph.service';
import { EmbeddingService } from './embedding.service';
import { StateService } from './state.service';
import { EngineService } from './engine.service';
import { TraversalService } from './traversal.service';
import { RuleEvaluatorService } from './rule-evaluator.service';
import { GenerateController } from './generate.controller';
import { AgentsModule } from '../agents/agents.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, AgentsModule, PrismaModule],
  controllers: [GenerateController],
  providers: [NarrativeGeneratorService, GraphService, EmbeddingService, StateService, EngineService, TraversalService, RuleEvaluatorService],
  exports: [NarrativeGeneratorService, GraphService, EmbeddingService, StateService, EngineService, TraversalService, RuleEvaluatorService],
})
export class GenerateModule {}
