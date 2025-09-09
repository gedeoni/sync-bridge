import { Request, Response } from 'express';
import {
  customerRepository,
  orderRepository,
  productRepository,
  orderItemRepository,
  syncHistoryRepository,
  sequelize,
} from '../../../databases/sequelize';
import { responseWrapper } from '../../../helpers/responseWrapper';
import { logger } from '../../../helpers/logger';
import  SyncHistory, { SyncStatus }  from '../../../databases/models/syncHistory.model';

const repositories: { [key: string]: any } = {
  customers: customerRepository,
  products: productRepository,
  orders: orderRepository,
};

export const sync = async (req: Request, res: Response) => {
  const { model, data } = req.body;

  const syncHistory = await syncHistoryRepository.create({
    payload: req.body,
    status: SyncStatus.PENDING_RETRY,
  });

  const repository = repositories[model];

  if (!repository) {
    logger.error(`Invalid model: ${model}`);
    await syncHistory.update({ status: SyncStatus.INVALID, failure_reason: `Invalid model: ${model}` });
    return responseWrapper({res, status: 400, message: `Invalid model: ${model}`} );
  }

  try {
    const results = [];
    for (const item of data) {
      const { id, ...attributes } = item;
      if (id) {
        const [updatedCount] = await repository.update(attributes, { where: { id } });
        if (updatedCount > 0) {
          results.push({ id, status: 'updated' });
        }
        if (model === 'orders' && item.items) {
          for (var orderItem of item.items) {
            orderItem = { ...orderItem, order_id: id };
            await upsertOrderItem(orderItem);
          }
        }
      } else {
        const created = await repository.create(item);
        // if the model is orders, push the created id in the order items
        if (model === 'orders' && item.items) {
          for (var orderItem of item.items) {
            orderItem = { ...orderItem, order_id: created.id };
            await upsertOrderItem(orderItem);
          }
        }
        results.push({ id: created.id, status: 'created' });
      }
    }
    await syncHistory.update({ status: SyncStatus.SUCCESSFUL });
    return responseWrapper({res, status: 200, message: 'Sync successful', data: { results } });
  } catch (error: any) {
    logger.error('Sync error:', error);
    await syncHistory.update({ status: SyncStatus.FAILED, failure_reason: error.message });
    return responseWrapper({res, status: 500, message: 'Sync failed'} );
  }
};

const upsertOrderItem = async (orderItem: any) => {
  if (orderItem.id) {
    await orderItemRepository.update(orderItem, { where: { id: orderItem.id } });
  } else {
    const createdOrderItem = await orderItemRepository.create(orderItem);
    orderItem.id = createdOrderItem.id;
  }
};

export const getStats = async (req: Request, res: Response) => {
  const stats = await syncHistoryRepository.findAll({
    attributes: [
      'status',
      [sequelize.fn('COUNT', sequelize.col('status')), 'count'],
    ],
    group: ['status'],
  });

  const statsSummary: { [key: string]: number } = {
    successful: 0,
    failed: 0,
    invalid: 0,
    pending_retry: 0,
    total: 0,
  };

  let total = 0;
  for (const stat of stats) {
    const { status, count } = stat.get() as any;
    const numCount = parseInt(count, 10);
    statsSummary[status] = numCount;
    total += numCount;
  }
  statsSummary.total = total;

  return responseWrapper({res, status: 200, message: 'Sync stats retrieved successfully', data: statsSummary});
};
