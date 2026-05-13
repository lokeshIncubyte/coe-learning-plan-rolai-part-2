import { Body, Controller, HttpCode, HttpStatus, Post, UseFilters, UseInterceptors } from '@nestjs/common';
import { NarrativeGeneratorService } from './narrative-generator.service';
import { OpenAiExceptionFilter } from './openai-exception.filter';
import { LoggingInterceptor } from './logging.interceptor';

export class GenerateRequestDto {
  prompt: string;
}

@Controller('generate')
@UseFilters(new OpenAiExceptionFilter())
@UseInterceptors(new LoggingInterceptor())
export class GenerateController {
  constructor(private readonly narrativeService: NarrativeGeneratorService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async generate(@Body() body: GenerateRequestDto) {
    const narrative = await this.narrativeService.generate(body.prompt);
    return {
      narrative,
      choices: ['Investigate', 'Flee', 'Negotiate'],
    };
  }
}
