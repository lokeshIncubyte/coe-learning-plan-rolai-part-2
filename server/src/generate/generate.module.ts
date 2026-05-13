import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NarrativeGeneratorService } from './narrative-generator.service';
import { GraphService } from './graph.service';
import { StateService } from './state.service';
import { EngineService } from './engine.service';

@Module({
  imports: [ConfigModule],
  providers: [NarrativeGeneratorService, GraphService, StateService, EngineService],
  exports: [NarrativeGeneratorService, GraphService, StateService, EngineService],
})
export class GenerateModule {}
