import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Customer } from '../sync/entities/customer.entity';
import { Product } from '../sync/entities/product.entity';
import { Order } from '../sync/entities/order.entity';
import { OrderItem } from '../sync/entities/order-item.entity';
import { Employee } from '../sync/entities/employee.entity';
import { SyncHistory } from '../sync/entities/sync-history.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DB_PATH || 'sync-bridge.db',
  entities: [Customer, Product, Order, OrderItem, Employee, SyncHistory],
  migrations: ['dist/migrations/*.js'],
  synchronize: false, // Turned off for database safety
});
