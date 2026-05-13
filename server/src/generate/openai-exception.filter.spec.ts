import { ArgumentsHost } from '@nestjs/common';
import { OpenAiExceptionFilter } from './openai-exception.filter';
import OpenAI from 'openai';

function makeHost() {
  const mockJson = jest.fn();
  const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
  return {
    host: {
      switchToHttp: () => ({
        getResponse: () => ({ status: mockStatus }),
        getRequest: () => ({}),
      }),
    } as unknown as ArgumentsHost,
    mockStatus,
    mockJson,
  };
}

describe('OpenAiExceptionFilter', () => {
  const filter = new OpenAiExceptionFilter();

  it.each<[string, number, unknown]>([
    ['RateLimitError', 429, new OpenAI.RateLimitError(429, undefined, 'Too Many Requests', null as any)],
    ['AuthenticationError', 401, new OpenAI.AuthenticationError(401, undefined, 'Unauthorized', null as any)],
    ['BadRequestError', 400, new OpenAI.BadRequestError(400, undefined, 'Bad Request', null as any)],
    ['APIConnectionError', 503, new OpenAI.APIConnectionError({ message: 'fetch failed' })],
  ])('maps %s to HTTP %i', (_label, expectedStatus, err) => {
    const { host, mockStatus, mockJson } = makeHost();
    filter.catch(err, host);
    expect(mockStatus).toHaveBeenCalledWith(expectedStatus);
    expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
  });
});
