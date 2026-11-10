import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ResponseHelper } from '../helpers/response.helper.js';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        if (
          typeof resObj.message === 'string' ||
          Array.isArray(resObj.message)
        ) {
          message = resObj.message as string | string[];
        } else if (typeof resObj.error === 'string') {
          message = resObj.error;
        } else {
          message = exception.message;
        }
      } else {
        message = exception.message;
      }

      if (
        statusCode === HttpStatus.PAYLOAD_TOO_LARGE &&
        typeof message === 'string' &&
        message.toLowerCase() === 'file too large'
      ) {
        message = 'Ukuran file terlalu besar. Maksimal ukuran file adalah 4MB.';
      }
    } else {
      this.logger.error(
        `Unhandled Exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response
      .status(statusCode)
      .json(ResponseHelper.error(statusCode, message, null));
  }
}
