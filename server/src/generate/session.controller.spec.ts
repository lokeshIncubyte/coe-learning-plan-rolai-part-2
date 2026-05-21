import { Test, TestingModule } from '@nestjs/testing'
import { SessionController } from './session.controller'
import { SessionService } from './session.service'

describe('SessionController — GET /session/:id/export routing smoke', () => {
  it('exportSession delegates to sessionService.exportSession and returns result', async () => {
    const exportSession = jest.fn().mockResolvedValue({ id: 'sess-1', history: [] })
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [{ provide: SessionService, useValue: { createSession: jest.fn(), exportSession } }],
    }).compile()
    const controller = module.get(SessionController)
    const result = await controller.exportSession('sess-1')
    expect(exportSession).toHaveBeenCalledWith('sess-1')
    expect(result).toEqual({ id: 'sess-1', history: [] })
  })
})
