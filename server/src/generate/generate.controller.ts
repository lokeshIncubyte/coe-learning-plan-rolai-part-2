import { Body, Controller, Post, UseFilters } from '@nestjs/common';
import { NarrativeGeneratorService } from './narrative-generator.service';
import { OpenAiExceptionFilter } from './openai-exception.filter';

export class GenerateRequestDto {
  prompt: string;
}

@Controller('generate')
@UseFilters(new OpenAiExceptionFilter())
export class GenerateController {
  constructor(private readonly narrativeService: NarrativeGeneratorService) {}

  @Post()
  async generate(@Body() body: GenerateRequestDto) {
    const narrative = await this.narrativeService.generate(body.prompt);
    return {
      narrative,
      choices: ['Investigate', 'Flee', 'Negotiate'],
    };
  }
}
