import { Test, TestingModule } from '@nestjs/testing'
import { GenerateController } from './generate.controller'
import { NarrativeGeneratorService } from './narrative-generator.service'
import { ActionValidatorService } from '../agents/action-validator.service'
import { ChoiceGeneratorService } from '../agents/choice-generator.service'
import { GraphService } from './graph.service'
import { TraversalService } from './traversal.service'
import { RuleEvaluatorService } from './rule-evaluator.service'
import { EngineService } from './engine.service'
import { EmbeddingService } from './embedding.service'
import { SessionService } from './session.service'
import { HistoryService } from './history.service'

describe('GenerateController', () => {
  let controller: GenerateController
  let service: NarrativeGeneratorService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn(), stream: jest.fn() } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'approved' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue(['Investigate', 'Flee', 'Negotiate']) } },
        { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockReturnValue([]) } },
        { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
        { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
        { provide: EngineService, useValue: { processDeltas: jest.fn().mockResolvedValue({ flaggedForReEmbed: [] }) } },
        { provide: EmbeddingService, useValue: { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) } },
        { provide: SessionService, useValue: { createSession: jest.fn().mockResolvedValue('sess-test') } },
        { provide: HistoryService, useValue: { logEntry: jest.fn().mockResolvedValue(undefined) } },
        { provide: ExtractorService, useValue: { extractDeltas: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile()

    controller = module.get(GenerateController)
    service = module.get(NarrativeGeneratorService)
  })

  it('calls service with prompt and returns narrative and choices', async () => {
    const generateMock = service.generate as jest.Mock
    generateMock.mockResolvedValueOnce('Once upon a time...')

    const result = await controller.generate({ prompt: 'Write beat 1' }, { user: { id: 'test-user' } })

    expect(generateMock).toHaveBeenCalledWith('Write beat 1', expect.any(String))
    expect(result).toMatchObject({
      narrative: 'Once upon a time...',
      choices: ['Investigate', 'Flee', 'Negotiate'],
    })
  })

  it('generate returns sessionId from sessionService', async () => {
    const generateMock = service.generate as jest.Mock
    generateMock.mockResolvedValueOnce('Once upon a time...')
    const result = await controller.generate({ prompt: 'Write beat 1' }, { user: { id: 'test-user' } })
    expect(result).toMatchObject({ sessionId: 'sess-test' })
  })

  // cycle-024
  it('generates narrative with modifiedAction when validator returns modified', async () => {
    const mod = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('narrative'), stream: jest.fn() } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'modified', modifiedAction: 'safe action', reason: 'too dangerous' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
        { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockResolvedValue([]) } },
        { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
        { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
        { provide: EngineService, useValue: { processDeltas: jest.fn().mockResolvedValue({ flaggedForReEmbed: [] }) } },
        { provide: EmbeddingService, useValue: { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) } },
        { provide: SessionService, useValue: { createSession: jest.fn().mockResolvedValue('sess-test') } },
        { provide: HistoryService, useValue: { logEntry: jest.fn().mockResolvedValue(undefined) } },
        { provide: ExtractorService, useValue: { extractDeltas: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();
    const ctrl = mod.get(GenerateController);
    const narrativeSvc = mod.get(NarrativeGeneratorService);

    await ctrl.generate({ prompt: 'dangerous action' }, { user: { id: 'test-user' } });

    expect(narrativeSvc.generate).toHaveBeenCalledWith('safe action', expect.any(String));
  });

  describe('stream SSE endpoint', () => {
    let controller: GenerateController;
    let narrativeService: { generate: jest.Mock; stream: jest.Mock };
    let validatorService: { validate: jest.Mock };
    let choiceGeneratorService: { generateChoices: jest.Mock };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [GenerateController],
        providers: [
          {
            provide: NarrativeGeneratorService,
            useValue: { generate: jest.fn(), stream: jest.fn() },
          },
          { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'accepted' }) } },
          { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn() } },
          { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockResolvedValue([]) } },
          { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
          { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
          { provide: EngineService, useValue: { processDeltas: jest.fn().mockResolvedValue({ flaggedForReEmbed: [] }) } },
        { provide: EmbeddingService, useValue: { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) } },
        { provide: SessionService, useValue: { createSession: jest.fn().mockResolvedValue('sess-test') } },
        { provide: HistoryService, useValue: { logEntry: jest.fn().mockResolvedValue(undefined) } },
        { provide: ExtractorService, useValue: { extractDeltas: jest.fn().mockResolvedValue([]) } },
        ],
      }).compile();

      controller = module.get(GenerateController);
      narrativeService = module.get(NarrativeGeneratorService) as any;
      validatorService = module.get(ActionValidatorService) as any;
      choiceGeneratorService = module.get(ChoiceGeneratorService) as any;
    });

    it('emits start, chunk, done, and choices MessageEvents in order', async () => {
      async function* fakeTokens() {
        yield 'Hello';
        yield ' world';
      }
      narrativeService.stream.mockImplementation(() => fakeTokens());
      choiceGeneratorService.generateChoices.mockResolvedValueOnce([
        { label: 'Run', entities: [], rules: [] },
      ]);

      const observable = controller.stream({ prompt: 'test' }, { user: { id: 'test-user' } });
      const events: any[] = [];
      await new Promise<void>((resolve, reject) => {
        observable.subscribe({
          next: (e) => events.push(e.data),
          error: reject,
          complete: resolve,
        });
      });

      expect(choiceGeneratorService.generateChoices).toHaveBeenCalledWith('Hello world', expect.any(String));
      expect(events).toEqual([
        { type: 'session', sessionId: 'sess-test' },
        { type: 'start' },
        { type: 'chunk', content: 'Hello' },
        { type: 'chunk', content: ' world' },
        { type: 'done' },
        { type: 'choices', choices: [{ label: 'Run', entities: [], rules: [] }] },
      ]);
    });

    it('emits error event and completes when stream throws', async () => {
      async function* failingStream() {
        yield 'partial';
        throw new Error('OpenAI blew up');
      }
      narrativeService.stream.mockImplementation(() => failingStream());

      const observable = controller.stream({ prompt: 'test' }, { user: { id: 'test-user' } });
      const events: any[] = [];
      await new Promise<void>((resolve, reject) => {
        observable.subscribe({
          next: (e) => events.push(e.data),
          error: reject,
          complete: resolve,
        });
      });

      expect(events).toEqual([
        { type: 'session', sessionId: 'sess-test' },
        { type: 'start' },
        { type: 'chunk', content: 'partial' },
        { type: 'error', message: 'OpenAI blew up' },
      ]);
    });

    it('passes AbortSignal to the service and aborts on unsubscribe', async () => {
      let capturedSignal: AbortSignal | undefined;
      let streamEntered: () => void;
      const streamEnteredPromise = new Promise<void>(res => { streamEntered = res; });

      async function* hangingStream() {
        streamEntered();
        // hang indefinitely so we can check the signal before it's aborted by teardown
        await new Promise<void>(() => {});
        yield 'a';
      }
      narrativeService.stream.mockImplementation((_prompt: string, signal: AbortSignal) => {
        capturedSignal = signal;
        return hangingStream();
      });
      choiceGeneratorService.generateChoices.mockResolvedValue([]);

      const sub = controller.stream({ prompt: 'test' }, { user: { id: 'test-user' } }).subscribe(() => {});
      await streamEnteredPromise;
      expect(capturedSignal).toBeDefined();
      expect(capturedSignal!.aborted).toBe(false);
      sub.unsubscribe();
      expect(capturedSignal!.aborted).toBe(true);
    });

    // cycle-025
    it('emits rejected event and completes without streaming when validator rejects', async () => {
      const mod = await Test.createTestingModule({
        controllers: [GenerateController],
        providers: [
          { provide: NarrativeGeneratorService, useValue: { generate: jest.fn(), stream: jest.fn() } },
          { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'rejected', reason: 'impossible action' }) } },
          { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
          { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockResolvedValue([]) } },
          { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
          { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
          { provide: EngineService, useValue: { processDeltas: jest.fn().mockResolvedValue({ flaggedForReEmbed: [] }) } },
        { provide: EmbeddingService, useValue: { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) } },
        { provide: SessionService, useValue: { createSession: jest.fn().mockResolvedValue('sess-test') } },
        { provide: HistoryService, useValue: { logEntry: jest.fn().mockResolvedValue(undefined) } },
        { provide: ExtractorService, useValue: { extractDeltas: jest.fn().mockResolvedValue([]) } },
        ],
      }).compile();
      const ctrl = mod.get(GenerateController);
      const narrativeSvc = mod.get(NarrativeGeneratorService);

      const events: any[] = [];
      await new Promise<void>((resolve, reject) => {
        ctrl.stream({ prompt: 'impossible' }, { user: { id: 'test-user' } }).subscribe({ next: (e) => events.push(e.data), error: reject, complete: resolve });
      });

      expect(events).toEqual([{ type: 'rejected', reason: 'impossible action' }]);
      expect(narrativeSvc.stream).not.toHaveBeenCalled();
    });

    // cycle-026
    it('emits modified event then streams using modifiedAction when validator returns modified', async () => {
      async function* tokens() { yield 'story'; }
      const mod = await Test.createTestingModule({
        controllers: [GenerateController],
        providers: [
          { provide: NarrativeGeneratorService, useValue: { generate: jest.fn(), stream: jest.fn().mockImplementation(() => tokens()) } },
          { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'modified', modifiedAction: 'adjusted action', reason: 'adjusted' }) } },
          { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
          { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockResolvedValue([]) } },
          { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
          { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
          { provide: EngineService, useValue: { processDeltas: jest.fn().mockResolvedValue({ flaggedForReEmbed: [] }) } },
        { provide: EmbeddingService, useValue: { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) } },
        { provide: SessionService, useValue: { createSession: jest.fn().mockResolvedValue('sess-test') } },
        { provide: HistoryService, useValue: { logEntry: jest.fn().mockResolvedValue(undefined) } },
        { provide: ExtractorService, useValue: { extractDeltas: jest.fn().mockResolvedValue([]) } },
        ],
      }).compile();
      const ctrl = mod.get(GenerateController);
      const narrativeSvc = mod.get(NarrativeGeneratorService);

      const events: any[] = [];
      await new Promise<void>((resolve, reject) => {
        ctrl.stream({ prompt: 'original prompt' }, { user: { id: 'test-user' } }).subscribe({ next: (e) => events.push(e.data), error: reject, complete: resolve });
      });

      expect(events[0]).toEqual({ type: 'session', sessionId: 'sess-test' });
      expect(events[1]).toEqual({ type: 'modified', modifiedAction: 'adjusted action' });
      expect(narrativeSvc.stream).toHaveBeenCalledWith('adjusted action', expect.any(Object), expect.any(String));
    });

    // cycle-050
    it('falls back to getAllEntitiesWithEdges when semanticRecall returns no entities', async () => {
      const getAllEntitiesWithEdges = jest.fn().mockResolvedValue([
        { id: 'e1', name: 'TestChar', type: 'character', state: {}, fromEdges: [], toEdges: [] },
      ]);
      const mod = await Test.createTestingModule({
        controllers: [GenerateController],
        providers: [
          { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('story'), stream: jest.fn() } },
          { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'accepted' }) } },
          { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
          { provide: GraphService, useValue: {
              semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }),
              getAllEntitiesWithEdges,
              getEntitiesByType: jest.fn().mockResolvedValue([]),
          }},
          { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
          { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
          { provide: EngineService, useValue: { processDeltas: jest.fn().mockResolvedValue({ flaggedForReEmbed: [] }) } },
        { provide: EmbeddingService, useValue: { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) } },
        { provide: SessionService, useValue: { createSession: jest.fn().mockResolvedValue('sess-test') } },
        { provide: HistoryService, useValue: { logEntry: jest.fn().mockResolvedValue(undefined) } },
        { provide: ExtractorService, useValue: { extractDeltas: jest.fn().mockResolvedValue([]) } },
        ],
      }).compile();

      await mod.get(GenerateController).generate({ prompt: 'test' }, { user: { id: 'test-user' } });

      expect(getAllEntitiesWithEdges).toHaveBeenCalled();
    });

    // cycle-049
    it('calls graphService.semanticRecall with the prompt when building context', async () => {
      const semanticRecall = jest.fn().mockResolvedValue({ entities: [], scores: new Map() });
      const getAllEntitiesWithEdges = jest.fn().mockResolvedValue([]);
      const mod = await Test.createTestingModule({
        controllers: [GenerateController],
        providers: [
          { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('story'), stream: jest.fn() } },
          { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'accepted' }) } },
          { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
          { provide: GraphService, useValue: { semanticRecall, getAllEntitiesWithEdges, getEntitiesByType: jest.fn().mockResolvedValue([]) } },
          { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
          { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
          { provide: EngineService, useValue: { processDeltas: jest.fn().mockResolvedValue({ flaggedForReEmbed: [] }) } },
        { provide: EmbeddingService, useValue: { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) } },
        { provide: SessionService, useValue: { createSession: jest.fn().mockResolvedValue('sess-test') } },
        { provide: HistoryService, useValue: { logEntry: jest.fn().mockResolvedValue(undefined) } },
        { provide: ExtractorService, useValue: { extractDeltas: jest.fn().mockResolvedValue([]) } },
        ],
      }).compile();

      await mod.get(GenerateController).generate({ prompt: 'test action' }, { user: { id: 'test-user' } });

      expect(semanticRecall).toHaveBeenCalledWith('test action', 8);
    });

    // cycle-027
    it('passes worldContext to choiceGenerator in SSE path', async () => {
      async function* tokens() { yield 'story'; }
      const heroEntity = { id: 'e1', name: 'Hero', type: 'character', tags: [], facts: null, archetype: null, backstory: null, role: null, identity_version: 0, state: null, last_beat: null, createdAt: new Date(), updatedAt: new Date(), fromEdges: [], toEdges: [] };
      const mod = await Test.createTestingModule({
        controllers: [GenerateController],
        providers: [
          { provide: NarrativeGeneratorService, useValue: { generate: jest.fn(), stream: jest.fn().mockImplementation(() => tokens()) } },
          { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'accepted', reason: '' }) } },
          { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
          {
            provide: GraphService,
            useValue: {
              semanticRecall: jest.fn().mockResolvedValue({ entities: [heroEntity], scores: new Map([['e1', 0.9]]) }),
              getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]),
              getEntitiesByType: jest.fn().mockResolvedValue([]),
            },
          },
          { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([{ ...heroEntity, proximityScore: 1, combinedScore: 1 }]), scoreWithSemantics: jest.fn().mockImplementation((t: any[]) => t) } },
          { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
          { provide: EngineService, useValue: { processDeltas: jest.fn().mockResolvedValue({ flaggedForReEmbed: [] }) } },
        { provide: EmbeddingService, useValue: { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) } },
        { provide: SessionService, useValue: { createSession: jest.fn().mockResolvedValue('sess-test') } },
        { provide: HistoryService, useValue: { logEntry: jest.fn().mockResolvedValue(undefined) } },
        { provide: ExtractorService, useValue: { extractDeltas: jest.fn().mockResolvedValue([]) } },
        ],
      }).compile();
      const ctrl = mod.get(GenerateController);
      const choiceSvc = mod.get(ChoiceGeneratorService);

      await new Promise<void>((resolve, reject) => {
        ctrl.stream({ prompt: 'test' }, { user: { id: 'test-user' } }).subscribe({ next: () => {}, error: reject, complete: resolve });
      });

      expect(choiceSvc.generateChoices).toHaveBeenCalledWith('story', expect.stringContaining('Hero'));
    });
  });

  // cycle-011
  it('propagates error when engineService.processDeltas throws', async () => {
    const processDeltas = jest.fn().mockRejectedValue(new Error('engine failure'));
    const mod = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: EngineService, useValue: { processDeltas } },
        { provide: EmbeddingService, useValue: { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) } },
        { provide: SessionService, useValue: { createSession: jest.fn().mockResolvedValue('sess-test') } },
        { provide: HistoryService, useValue: { logEntry: jest.fn().mockResolvedValue(undefined) } },
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn(), stream: jest.fn() } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'accepted' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
        { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockResolvedValue([]) } },
        { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
        { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
        { provide: ExtractorService, useValue: { extractDeltas: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();

    await expect(
      mod.get(GenerateController).generate({
        prompt: 'test',
        deltas: [{ op: 'state_mutation', entityId: 'bad-id', patch: { hp: 10 } }],
      }, { user: { id: 'test-user' } }),
    ).rejects.toThrow('engine failure');
  });

  // cycle-010
  it('calls engineService.processDeltas with body.deltas before generating narrative', async () => {
    const processDeltas = jest.fn().mockResolvedValue({ flaggedForReEmbed: [] });
    const mod = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: EngineService, useValue: { processDeltas } },
        { provide: EmbeddingService, useValue: { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) } },
        { provide: SessionService, useValue: { createSession: jest.fn().mockResolvedValue('sess-test') } },
        { provide: HistoryService, useValue: { logEntry: jest.fn().mockResolvedValue(undefined) } },
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('narrative'), stream: jest.fn() } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'accepted' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
        { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockResolvedValue([]) } },
        { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
        { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
        { provide: ExtractorService, useValue: { extractDeltas: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();

    const delta = { op: 'state_mutation' as const, entityId: 'e1', patch: { hp: 50 } };
    await mod.get(GenerateController).generate({ prompt: 'test', deltas: [delta] }, { user: { id: 'test-user' } });

    expect(processDeltas).toHaveBeenCalledWith([delta], expect.any(Object));
  });

  // cycle-012
  it('calls embeddingService.embedEntityIdentity for each flaggedForReEmbed delta', async () => {
    const embedEntityIdentity = jest.fn().mockResolvedValue(undefined);
    const processDeltas = jest.fn().mockResolvedValue({
      flaggedForReEmbed: [
        { op: 'identity_shift', entityId: 'e1', patch: { archetype: 'Warrior' } },
        { op: 'identity_shift', entityId: 'e2', patch: { role: 'villain' } },
      ],
    });
    const mod = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: EngineService, useValue: { processDeltas } },
        { provide: EmbeddingService, useValue: { embedEntityIdentity } },
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('story'), stream: jest.fn() } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'approved' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
        { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockResolvedValue([]) } },
        { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
        { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
        { provide: SessionService, useValue: { createSession: jest.fn().mockResolvedValue('sess-test') } },
        { provide: HistoryService, useValue: { logEntry: jest.fn().mockResolvedValue(undefined) } },
        { provide: ExtractorService, useValue: { extractDeltas: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();

    await mod.get(GenerateController).generate({
      prompt: 'test',
      deltas: [{ op: 'identity_shift', entityId: 'e1', patch: { archetype: 'Warrior' } }],
    }, { user: { id: 'test-user' } });

    expect(embedEntityIdentity).toHaveBeenCalledWith('e1');
    expect(embedEntityIdentity).toHaveBeenCalledWith('e2');
  });
})

// cycle-022
describe('GenerateController — session + history wiring', () => {
  it('calls sessionService.createSession and historyService.logEntry on each generate call', async () => {
    const createSession = jest.fn().mockResolvedValue('sess-xyz')
    const logEntry = jest.fn().mockResolvedValue(undefined)

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('A tale.'), stream: jest.fn() } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'approved' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue(['Go left']) } },
        { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [{ id: 'e1', name: 'Cave', type: 'location', state: {} }], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockReturnValue([]) } },
        { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
        { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
        { provide: EngineService, useValue: { processDeltas: jest.fn().mockResolvedValue({ flaggedForReEmbed: [] }) } },
        { provide: EmbeddingService, useValue: { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) } },
        { provide: SessionService, useValue: { createSession } },
        { provide: HistoryService, useValue: { logEntry } },
        { provide: ExtractorService, useValue: { extractDeltas: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile()

    const controller = module.get(GenerateController)
    await controller.generate({ prompt: 'I explore.' }, { user: { id: 'test-user' } })

    expect(createSession).toHaveBeenCalledTimes(1)
    expect(logEntry).toHaveBeenCalledWith('sess-xyz', 'A tale.', 'e1', [])
  })
})

// cycle-023
import { ExtractorService } from '../upload/extractor.service'
import type { Delta } from '../upload/extractor.service'

describe('GenerateController — extractor write-back', () => {
  it('calls extractorService.extractDeltas then engineService.processDeltas with extracted deltas', async () => {
    const extractedDeltas: Delta[] = [{ op: 'state_mutation', entityId: 'e1', patch: { hp: 80 } }]
    const extractDeltas = jest.fn().mockResolvedValue(extractedDeltas)
    const processDeltas = jest.fn().mockResolvedValue({ flaggedForReEmbed: [] })

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('The hero fights.'), stream: jest.fn() } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'approved' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
        { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockReturnValue([]) } },
        { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
        { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
        { provide: EngineService, useValue: { processDeltas } },
        { provide: EmbeddingService, useValue: { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) } },
        { provide: SessionService, useValue: { createSession: jest.fn().mockResolvedValue('sess-1') } },
        { provide: HistoryService, useValue: { logEntry: jest.fn().mockResolvedValue(undefined) } },
        { provide: ExtractorService, useValue: { extractDeltas } },
      ],
    }).compile()

    const controller = module.get(GenerateController)
    await controller.generate({ prompt: 'Attack the dragon.' }, { user: { id: 'test-user' } })

    expect(extractDeltas).toHaveBeenCalledWith('The hero fights.')
    expect(processDeltas).toHaveBeenCalledTimes(1)
    const secondCall = processDeltas.mock.calls[0]
    expect(secondCall[0]).toEqual(extractedDeltas)
  })
})

// cycle-024
describe('GenerateController — write-back error skip', () => {
  it('returns narrative and choices even when extractDeltas throws', async () => {
    const extractDeltas = jest.fn().mockRejectedValue(new Error('Malformed JSON from LLM'))

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('The dragon retreats.'), stream: jest.fn() } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'approved' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue(['Pursue', 'Rest']) } },
        { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockReturnValue([]) } },
        { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
        { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
        { provide: EngineService, useValue: { processDeltas: jest.fn().mockResolvedValue({ flaggedForReEmbed: [] }) } },
        { provide: EmbeddingService, useValue: { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) } },
        { provide: SessionService, useValue: { createSession: jest.fn().mockResolvedValue('sess-1') } },
        { provide: HistoryService, useValue: { logEntry: jest.fn().mockResolvedValue(undefined) } },
        { provide: ExtractorService, useValue: { extractDeltas } },
      ],
    }).compile()

    const controller = module.get(GenerateController)
    const result = await controller.generate({ prompt: 'Chase it.' }, { user: { id: 'test-user' } })

    expect(result).toMatchObject({ narrative: 'The dragon retreats.', choices: ['Pursue', 'Rest'] })
  })

  it('generate returns modifiedAction when validator returns modified', async () => {
    const mod = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('narrative'), stream: jest.fn() } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'modified', modifiedAction: 'safe action' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
        { provide: GraphService, useValue: { semanticRecall: jest.fn().mockResolvedValue({ entities: [], scores: new Map() }), getAllEntitiesWithEdges: jest.fn().mockResolvedValue([]), getEntitiesByType: jest.fn().mockReturnValue([]) } },
        { provide: TraversalService, useValue: { traverse: jest.fn().mockReturnValue([]), scoreWithSemantics: jest.fn().mockReturnValue([]) } },
        { provide: RuleEvaluatorService, useValue: { evaluateRules: jest.fn().mockReturnValue([]) } },
        { provide: EngineService, useValue: { processDeltas: jest.fn().mockResolvedValue({ flaggedForReEmbed: [] }) } },
        { provide: EmbeddingService, useValue: { embedEntityIdentity: jest.fn().mockResolvedValue(undefined) } },
        { provide: SessionService, useValue: { createSession: jest.fn().mockResolvedValue('sess-test') } },
        { provide: HistoryService, useValue: { logEntry: jest.fn().mockResolvedValue(undefined) } },
        { provide: ExtractorService, useValue: { extractDeltas: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile()
    const ctrl = mod.get(GenerateController)
    const result = await ctrl.generate({ prompt: 'dangerous action' }, { user: { id: 'test-user' } })
    expect(result).toMatchObject({ modifiedAction: 'safe action' })
  })
})
