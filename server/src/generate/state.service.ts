import { Injectable } from '@nestjs/common';

@Injectable()
export class StateService {
  // Stub — replaced with real session state management on Day 5
  getState(sessionId: string): Record<string, unknown> {
    return { sessionId, phase: 'adventure' };
  }
}
