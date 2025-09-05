import { IPaginationArgs } from '../types/shared.types';
import { Model } from 'sequelize';
import { Repository } from 'sequelize-typescript';

export const getPagination = async (paginationArgs: IPaginationArgs, repository?: Repository<Model>) => {
  const limit = paginationArgs.limit ?? 15;
  const page = paginationArgs.page && paginationArgs.page > 0 ? paginationArgs.page - 1 : 0;

  const offset = page * limit;

  let total, pages;

  if (repository) {
    total = await repository.count({});
    pages = Math.ceil(total / limit);
  }

  return {
    limit,
    offset,
    total,
    pages,
    page: paginationArgs.page,
  };
};
