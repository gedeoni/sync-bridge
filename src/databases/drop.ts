import * as dotenv from 'dotenv';
dotenv.config();
import {
  customerRepository,
  productRepository,
  orderRepository,
  orderItemRepository,
} from './sequelize';

const dropTable = async () => {
  const repositories = [
    orderItemRepository,
    orderRepository,
    customerRepository,
    productRepository,
  ];

  for (const repository of repositories) {
    await repository.drop({ cascade: true });
  }
};

dropTable();
