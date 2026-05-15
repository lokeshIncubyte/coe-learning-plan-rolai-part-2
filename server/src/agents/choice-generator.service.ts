import { Injectable } from '@nestjs/common';

export interface Choice {
  label: string;
  entities: string[];
  rules: string[];
}

@Injectable()
export class ChoiceGeneratorService {
  // Stub — replaced with real choice generation logic on Day 5
  async generateChoices(_narrative: string, _worldContext: string): Promise<Choice[]> {
    return [];
  }
}
