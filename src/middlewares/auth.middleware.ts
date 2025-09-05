import { Request, Response, NextFunction } from 'express';
import { responseWrapper } from '../helpers/responseWrapper';
import httpCodes from '../constants/httpCodes';
import { customEnv } from '../helpers/customEnv';

export const isAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.headers['x-auth-token'] || req.headers['x-auth-token'] !== customEnv.AUTHORIZATION_KEY) {
      return responseWrapper({
        res,
        status: httpCodes.UNAUTHORIZED,
        message: 'Access Denied',
      });
    }
    next();
  } catch (error) {
    return next(error);
  }
};
