import { Injectable } from '@nestjs/common';

@Injectable()
export class ActionValidatorService {
  // Stub — replaced with real validation logic on Day 5
  async validate(
    _prompt: string,
    _ruleContext: string,
  ): Promise<{ result: 'approved' | 'rejected'; reason?: string }> {
    return { result: 'approved' };
  }
}
