import { GraphService } from './graph.service';
import { StateService } from './state.service';
import { EngineService } from './engine.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  entity: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  edge: { create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  $transaction: jest.fn(),
} as unknown as PrismaService;

describe('GraphService', () => {
  it('is constructable with PrismaService', () => {
    expect(new GraphService(mockPrisma)).toBeInstanceOf(GraphService);
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
    await expect(new EngineService(new GraphService(mockPrisma)).process(input)).resolves.toEqual(input);
  });
});
