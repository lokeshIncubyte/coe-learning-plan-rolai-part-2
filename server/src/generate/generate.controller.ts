import { Body, Controller, Post } from '@nestjs/common';
import { NarrativeGeneratorService } from './narrative-generator.service';

export class GenerateRequestDto {
  prompt: string;
}

@Controller('generate')
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
