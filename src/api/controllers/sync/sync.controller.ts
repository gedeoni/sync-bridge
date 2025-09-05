import { Request, Response } from 'express';
import {
  customerRepository,
  orderRepository,
  productRepository,
  orderItemRepository,
} from '../../../databases/sequelize';
import { responseWrapper } from '../../../helpers/responseWrapper';
import { logger } from '../../../helpers/logger';

const repositories: { [key: string]: any } = {
  customers: customerRepository,
  products: productRepository,
  orders: orderRepository,
};

export const sync = async (req: Request, res: Response) => {
  const { model, data } = req.body;
  const repository = repositories[model];

  if (!repository) {
    logger.error(`Invalid model: ${model}`);
    return responseWrapper({ res, status: 400, message: `Invalid model: ${model}` });
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
    return responseWrapper({ res, status: 200, message: 'Sync successful', data: { results } });
  } catch (error) {
    logger.error('Sync error:', error);
    return responseWrapper({ res, status: 500, message: 'Sync failed' });
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
