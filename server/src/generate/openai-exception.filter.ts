import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import OpenAI from 'openai';

@Catch(OpenAI.APIError)
export class OpenAiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof OpenAI.RateLimitError) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      message = 'Rate limit exceeded';
    } else if (exception instanceof OpenAI.AuthenticationError) {
      status = HttpStatus.UNAUTHORIZED;
      message = 'Invalid API key';
    } else if (exception instanceof OpenAI.BadRequestError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Bad request';
    } else if (exception instanceof OpenAI.APIConnectionError) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Service unavailable';
    }

    response.status(status).json({ message });
  }
}
