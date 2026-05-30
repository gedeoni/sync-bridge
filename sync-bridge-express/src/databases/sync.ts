import * as dotenv from 'dotenv';
dotenv.config();
import { sequelize } from './sequelize';
import { logger } from '../helpers/logger';

export default sequelize
  .sync({ alter: { drop: false }, logging: true })
  .then(() => {
    logger.info('Database & tables synced');
  })
  .catch((err) => {
    logger.error('Error syncing database', err);
    // re-throw the error to be caught by the caller
    throw err;
  });
