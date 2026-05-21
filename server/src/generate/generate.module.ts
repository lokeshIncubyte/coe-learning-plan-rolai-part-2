import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NarrativeGeneratorService } from './narrative-generator.service';
import { GraphService } from './graph.service';
import { EmbeddingService } from './embedding.service';
import { StateService } from './state.service';
import { EngineService } from './engine.service';
import { TraversalService } from './traversal.service';
import { RuleEvaluatorService } from './rule-evaluator.service';
import { SessionService } from './session.service';
import { HistoryService } from './history.service';
import { GenerateController } from './generate.controller';
import { SessionController } from './session.controller';
import { AgentsModule } from '../agents/agents.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ExtractorService } from '../upload/extractor.service';

@Module({
  imports: [ConfigModule, AgentsModule, PrismaModule],
  controllers: [GenerateController, SessionController],
  providers: [NarrativeGeneratorService, GraphService, EmbeddingService, StateService, EngineService, TraversalService, RuleEvaluatorService, SessionService, HistoryService, ExtractorService],
  exports: [NarrativeGeneratorService, GraphService, EmbeddingService, StateService, EngineService, TraversalService, RuleEvaluatorService, SessionService, HistoryService, ExtractorService],
})
export class GenerateModule {}
