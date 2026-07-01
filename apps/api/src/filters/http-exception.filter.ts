import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { logger } from '../logger';

interface ErrorResponseBody {
  success: false;
  statusCode: number;
  message: string;
  errors?: string[];
  timestamp: string;
  path: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{
      status: (statusCode: number) => { json: (body: unknown) => void };
    }>();
    const request = ctx.getRequest<{ method?: string; url?: string; headers?: any }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    // Extract message — NestJS ValidationPipe returns { message: string[] }
    let message: string;
    let errors: string[] | undefined;

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const rawMessage = (exceptionResponse as { message: string | string[] }).message;
      if (Array.isArray(rawMessage)) {
        errors = rawMessage;
        message = rawMessage[0] ?? 'Validation failed';
      } else {
        message = rawMessage;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    } else {
      message = 'Internal server error';
    }

    const payload = {
      method: request.method || 'REQUEST',
      path: request.url || '',
      status,
      message,
      headers: {
        origin: request.headers?.origin,
        host: request.headers?.host,
      },
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      logger.error(payload, exception instanceof Error ? exception.stack : undefined);
    } else {
      logger.warn(payload);
    }

    const body: ErrorResponseBody = {
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url ?? '',
    };

    if (errors && errors.length > 0) {
      body.errors = errors;
    }

    response.status(status).json(body);
  }
}
