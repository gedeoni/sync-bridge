import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { responseWithStatus } from '../utils/response.util';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const contextType = host.getType<string>();
    if (contextType === 'graphql') {
      return this.handleGraphql(exception);
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resObj = res as any;
      const payload =
        typeof res === 'string'
          ? responseWithStatus(status, res)
          : responseWithStatus(
              resObj.status || status,
              resObj.message || exception.message,
              resObj.data,
              resObj.errors,
            );
      return response.status(payload.status).json(payload);
    }

    if (exception instanceof QueryFailedError) {
      const message = this.extractUniqueConstraintMessage(exception.message);
      const payload = responseWithStatus(409, message);
      return response.status(payload.status).json(payload);
    }

    this.logger.error(exception);
    const payload = responseWithStatus(500, 'Internal Server Error');
    return response.status(payload.status).json(payload);
  }

  private handleGraphql(exception: unknown) {
    if (exception instanceof HttpException) {
      return exception;
    }

    if (exception instanceof QueryFailedError) {
      const message = this.extractUniqueConstraintMessage(exception.message);
      return new ConflictException(message);
    }

    this.logger.error(exception);
    return new InternalServerErrorException('Internal Server Error');
  }

  private extractUniqueConstraintMessage(message: string) {
    if (message?.toLowerCase().includes('unique')) {
      const match = message.match(/UNIQUE constraint failed: ([^\s]+)/i);
      if (match && match[1]) {
        return `Duplicate entry: field '${match[1].split('.').pop()}' already exists`;
      }
      return 'Duplicate entry detected';
    }
    return 'Data constraint violation';
  }
}
