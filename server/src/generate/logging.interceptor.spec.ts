import { ExecutionContext, CallHandler } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('logs method and url before, then narrative length and latency after', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', url: '/api/generate' }),
      }),
    } as unknown as ExecutionContext;

    const mockHandler: CallHandler = {
      handle: () => of({ narrative: 'Hello world' }),
    };

    await lastValueFrom(interceptor.intercept(mockContext, mockHandler));

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('POST'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('/api/generate'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('narrative length: 11'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/\d+ms/));
  });
});
