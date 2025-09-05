import { IResponseWrapper } from '../types/shared.types';
import { Response } from 'express';

export function responseWrapper<Data>({ res, message, status, ...rest }: IResponseWrapper<Data>): Response {
  return res.status(status).json({
    status,
    message,
    ...rest,
  });
}
