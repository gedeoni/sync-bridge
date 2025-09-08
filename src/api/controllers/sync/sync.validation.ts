import Joi from 'joi';
import { OrderItemBodyDto } from '../../../types/dtos';

export const customerSchema = Joi.object({
  id: Joi.number().optional(),
  email: Joi.string().email().required(),
  first_name: Joi.string().required(),
  last_name: Joi.string().required(),
  default_currency: Joi.string().length(3).optional(),
});

export const productSchema = Joi.object({
  id: Joi.number().optional(),
  name: Joi.string().required(),
  description: Joi.string().optional(),
  price: Joi.number().required(),
  currency: Joi.string().length(3).optional(),
  active: Joi.boolean().optional(),
  weight_grams: Joi.number().optional(),
});

export const orderItemSchema = Joi.object({
  id: Joi.number().optional(),
  product_id: Joi.number().required(),
  qty: Joi.number().required(),
  unit_price: Joi.number().required(),
});

export const orderSchema = Joi.object({
  id: Joi.number().optional(),
  order_number: Joi.string().required(),
  customer_id: Joi.number().required(),
  status: Joi.string().valid('pending', 'paid', 'shipped', 'completed', 'cancelled', 'refunded').required(),
  currency: Joi.string().length(3).optional(),
  amount: Joi.number().required(),
  items: Joi.array().items(orderItemSchema).optional(),
}).custom((order, helpers) => {
  // If items are not present or empty, no need to validate the amount against them.
  if (!order.items || order.items.length === 0) {
    return order;
  }

  const calculatedAmount = order.items.reduce((total: number, item: OrderItemBodyDto) => {
    return total + item.unit_price * item.qty;
  }, 0);

  if (order.amount !== calculatedAmount) {
    // The path 'amount' tells Joi which field the error is associated with.
    return helpers.error('any.custom', {
      message: 'Order amount must equal the sum of item prices (qty * unit_price).',
    });
  }

  return order;
});

export const syncSchema = Joi.object({
  model: Joi.string().valid('customers', 'products', 'orders').required(),
  data: Joi.when('model', {
    switch: [
      { is: 'customers', then: Joi.array().items(customerSchema).min(1).required() },
      { is: 'products', then: Joi.array().items(productSchema).min(1).required() },
      { is: 'orders', then: Joi.array().items(orderSchema).min(1).required() },
    ],
    otherwise: Joi.forbidden(),
  }),
});
