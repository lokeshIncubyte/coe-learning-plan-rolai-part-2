import { Injectable } from '@nestjs/common';

@Injectable()
export class EngineService {
  // Stub — replaced with deterministic pipeline orchestration on Day 9
  async process(input: { narrative: string; choices: string[] }) {
    return input;
  }
}
