import { Request, Response, NextFunction } from 'express';
import { responseWrapper } from '../helpers/responseWrapper';
import httpCodes from '../constants/httpCodes';
import { logger } from '../helpers/logger';
import { customEnv } from '../helpers/customEnv';
import { isCelebrateError, type CelebrateError } from 'celebrate';

interface ErrorT extends Error {
  status?: number;
}

export const errorHandler = (
  error: ErrorT | CelebrateError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  if (customEnv.NODE_ENV === 'development' || customEnv.NODE_ENV === 'test') {
    // eslint-disable-next-line no-console
    console.log(error);
  }

  logger.error(
    {
      req: req,
      error: error,
      body: req.body,
      method: req.method,
      url: req.url,
      message: isCelebrateError(error) ? error?.details?.get('body')?.message : error?.message,
    },
    error?.message ?? 'error handling the request'
  );

  const status = isCelebrateError(error) ? httpCodes.BAD_REQUEST : error?.status ?? httpCodes.INTERNAL_SERVER_ERROR;

  const response = isCelebrateError(error)
    ? {
        res,
        status: httpCodes.BAD_REQUEST,
        message: error.message,
        data: undefined,
        errors:
          error.details.get('headers')?.details ||
          error.details.get('params')?.details ||
          error.details.get('query')?.details ||
          error.details.get('body')?.details,
      }
    : {
        res,
        data: {
          message: error?.message,
          method: req.method,
          url: req.url,
        },
        status: error?.name === 'SequelizeUniqueConstraintError' ? httpCodes.CONFLICT : status,
        message:
          error?.name === 'SequelizeUniqueConstraintError'
            ? 'Record already exists'
            : error?.name !== 'SequelizeUniqueConstraintError' && status >= httpCodes.INTERNAL_SERVER_ERROR
            ? 'Something Went Wrong'
            : 'Internal Server Error',
      };

  return responseWrapper(response);
};
