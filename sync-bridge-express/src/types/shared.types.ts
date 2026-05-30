import { Response } from 'express';

export interface IPaginationArgs {
  limit?: number;
  page?: number;
}

export interface IResponseWrapper<Data> {
  res: Response;
  status: number;
  message: string;
  data?: Data;
}
