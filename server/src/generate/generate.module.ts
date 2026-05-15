import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NarrativeGeneratorService } from './narrative-generator.service';
import { GraphService } from './graph.service';
import { StateService } from './state.service';
import { EngineService } from './engine.service';
import { GenerateController } from './generate.controller';
import { ActionValidatorService } from '../agents/action-validator.service';
import { ChoiceGeneratorService } from '../agents/choice-generator.service';

@Module({
  imports: [ConfigModule],
  controllers: [GenerateController],
  providers: [NarrativeGeneratorService, GraphService, StateService, EngineService, ActionValidatorService, ChoiceGeneratorService],
  exports: [NarrativeGeneratorService, GraphService, StateService, EngineService, ActionValidatorService, ChoiceGeneratorService],
})
export class GenerateModule {}
