import { GraphService } from './graph.service';
import { StateService } from './state.service';
import { EngineService } from './engine.service';

describe('GraphService', () => {
  it('getEntities returns an array', () => {
    expect(Array.isArray(new GraphService().getEntities())).toBe(true);
  });
});

describe('StateService', () => {
  it('getState returns object containing the sessionId', () => {
    expect(new StateService().getState('session-1')).toMatchObject({ sessionId: 'session-1' });
  });
});

describe('EngineService', () => {
  it('process returns input unchanged', async () => {
    const input = { narrative: 'test', choices: [] };
    await expect(new EngineService().process(input)).resolves.toEqual(input);
  });
});
