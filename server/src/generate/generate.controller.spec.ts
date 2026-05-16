import { Test, TestingModule } from '@nestjs/testing'
import { GenerateController } from './generate.controller'
import { NarrativeGeneratorService } from './narrative-generator.service'
import { ActionValidatorService } from '../agents/action-validator.service'
import { ChoiceGeneratorService } from '../agents/choice-generator.service'
import { GraphService } from './graph.service'

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
        { provide: GraphService, useValue: { getEntitiesByType: jest.fn().mockReturnValue([]) } },
      ],
    }).compile()

    controller = module.get(GenerateController)
    service = module.get(NarrativeGeneratorService)
  })

  it('calls service with prompt and returns narrative and choices', async () => {
    const generateMock = service.generate as jest.Mock
    generateMock.mockResolvedValueOnce('Once upon a time...')

    const result = await controller.generate({ prompt: 'Write beat 1' })

    expect(generateMock).toHaveBeenCalledWith('Write beat 1')
    expect(result).toEqual({
      narrative: 'Once upon a time...',
      choices: ['Investigate', 'Flee', 'Negotiate'],
    })
  })

  // cycle-024
  it('generates narrative with modifiedAction when validator returns modified', async () => {
    const mod = await Test.createTestingModule({
      controllers: [GenerateController],
      providers: [
        { provide: NarrativeGeneratorService, useValue: { generate: jest.fn().mockResolvedValue('narrative'), stream: jest.fn() } },
        { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'modified', modifiedAction: 'safe action', reason: 'too dangerous' }) } },
        { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
        { provide: GraphService, useValue: { getEntitiesByType: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();
    const ctrl = mod.get(GenerateController);
    const narrativeSvc = mod.get(NarrativeGeneratorService);

    await ctrl.generate({ prompt: 'dangerous action' });

    expect(narrativeSvc.generate).toHaveBeenCalledWith('safe action');
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
          { provide: GraphService, useValue: { getEntitiesByType: jest.fn().mockResolvedValue([]) } },
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

      const observable = controller.stream({ prompt: 'test' });
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

      const observable = controller.stream({ prompt: 'test' });
      const events: any[] = [];
      await new Promise<void>((resolve, reject) => {
        observable.subscribe({
          next: (e) => events.push(e.data),
          error: reject,
          complete: resolve,
        });
      });

      expect(events).toEqual([
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

      const sub = controller.stream({ prompt: 'test' }).subscribe(() => {});
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
          { provide: GraphService, useValue: { getEntitiesByType: jest.fn().mockResolvedValue([]) } },
        ],
      }).compile();
      const ctrl = mod.get(GenerateController);
      const narrativeSvc = mod.get(NarrativeGeneratorService);

      const events: any[] = [];
      await new Promise<void>((resolve, reject) => {
        ctrl.stream({ prompt: 'impossible' }).subscribe({ next: (e) => events.push(e.data), error: reject, complete: resolve });
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
          { provide: GraphService, useValue: { getEntitiesByType: jest.fn().mockResolvedValue([]) } },
        ],
      }).compile();
      const ctrl = mod.get(GenerateController);
      const narrativeSvc = mod.get(NarrativeGeneratorService);

      const events: any[] = [];
      await new Promise<void>((resolve, reject) => {
        ctrl.stream({ prompt: 'original prompt' }).subscribe({ next: (e) => events.push(e.data), error: reject, complete: resolve });
      });

      expect(events[0]).toEqual({ type: 'modified', modifiedAction: 'adjusted action' });
      expect(narrativeSvc.stream).toHaveBeenCalledWith('adjusted action', expect.any(Object));
    });

    // cycle-027
    it('passes worldContext to choiceGenerator in SSE path', async () => {
      async function* tokens() { yield 'story'; }
      const mod = await Test.createTestingModule({
        controllers: [GenerateController],
        providers: [
          { provide: NarrativeGeneratorService, useValue: { generate: jest.fn(), stream: jest.fn().mockImplementation(() => tokens()) } },
          { provide: ActionValidatorService, useValue: { validate: jest.fn().mockResolvedValue({ result: 'accepted', reason: '' }) } },
          { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn().mockResolvedValue([]) } },
          {
            provide: GraphService,
            useValue: {
              getEntitiesByType: jest.fn().mockImplementation((type: string) => {
                if (type === 'character') return Promise.resolve([{ name: 'Hero', type: 'character' }]);
                return Promise.resolve([]);
              }),
            },
          },
        ],
      }).compile();
      const ctrl = mod.get(GenerateController);
      const choiceSvc = mod.get(ChoiceGeneratorService);

      await new Promise<void>((resolve, reject) => {
        ctrl.stream({ prompt: 'test' }).subscribe({ next: () => {}, error: reject, complete: resolve });
      });

      expect(choiceSvc.generateChoices).toHaveBeenCalledWith('story', expect.stringContaining('Hero'));
    });
  });
})
