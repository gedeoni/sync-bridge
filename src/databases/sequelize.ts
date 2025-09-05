import { Sequelize } from 'sequelize-typescript';
import { customEnv } from '../helpers/customEnv';
import { logger } from '../helpers/logger';
import Customer from './models/customers.model';
import Product from './models/products.model';
import Order from './models/orders.model';
import OrderItem from './models/orderItems.model';

const dbUri = customEnv.DATABASE_URI as string;

export const connect = (url: string) => {
  const sequelize = new Sequelize(url, {
    models: [Customer, Product, Order, OrderItem],
    repositoryMode: true,
    replication: {
      read: [{ host: customEnv.SLAVE_ONE }],
      write: { host: customEnv.MAIN_HOST },
    },
    logging:
      customEnv.NODE_ENV === 'development'
        ? (sql: string) => {
            // Only log the SQL statement without the timing info
            logger.debug(`[Sequelize] ${sql}`);
          }
        : false,

    dialectOptions: {
      useUTC: false,
    },
    ...(url.startsWith('sqlite') ? {} : { timezone: '+2:00' }), // Kigali timezone
    dialect: url.startsWith('sqlite') ? 'sqlite' : 'postgres',
  });

  return sequelize;
};

export const sequelize = connect(dbUri);

export const customerRepository = sequelize.getRepository(Customer);
export const productRepository = sequelize.getRepository(Product);
export const orderRepository = sequelize.getRepository(Order);
export const orderItemRepository = sequelize.getRepository(OrderItem);

