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
          { provide: ActionValidatorService, useValue: { validate: jest.fn() } },
          { provide: ChoiceGeneratorService, useValue: { generateChoices: jest.fn() } },
          { provide: GraphService, useValue: { getEntitiesByType: jest.fn().mockReturnValue([]) } },
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

    it('passes AbortSignal to the service and aborts on unsubscribe', () => {
      let capturedSignal: AbortSignal | undefined;
      async function* twoTokens() { yield 'a'; yield 'b'; }
      narrativeService.stream.mockImplementation((_prompt: string, signal: AbortSignal) => {
        capturedSignal = signal;
        return twoTokens();
      });

      const sub = controller.stream({ prompt: 'test' }).subscribe(() => {});
      expect(capturedSignal).toBeDefined();
      expect(capturedSignal!.aborted).toBe(false);
      sub.unsubscribe();
      expect(capturedSignal!.aborted).toBe(true);
    });
  });
})
