import { EngineToolsService } from './engine-tools.service';

describe('EngineToolsService', () => {
  let service: EngineToolsService;

  beforeEach(() => {
    service = new EngineToolsService({} as any);
  });

  it('getTools() returns exactly 3 function tools', () => {
    const tools = service.getTools();
    expect(tools).toHaveLength(3);
    expect(tools.every(t => t.type === 'function')).toBe(true);
  });

  it('tool names are apply_delta, fire_cascade, resolve_rule_conflict', () => {
    const names = service.getTools().map(t => t.function.name);
    expect(names).toContain('apply_delta');
    expect(names).toContain('fire_cascade');
    expect(names).toContain('resolve_rule_conflict');
  });
});
