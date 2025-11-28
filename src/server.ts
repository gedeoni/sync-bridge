import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import * as http from 'http';
import './databases/sequelize';
import { logger } from './helpers/logger';
import { customEnv } from './helpers/customEnv';

import { startApolloServer } from './graphql/server';
import { startGraphQLWSServer, WsCleanup } from './graphql/ws';

import { responseWrapper } from './helpers/responseWrapper';
import httpCodes from './constants/httpCodes';

import sequelize from './databases/sync';
import app from './app';

const server = http.createServer(app);
let wsCleanup: WsCleanup | null = null;
const port = customEnv.APP_PORT ?? 4007;

const startServer = async () => {
  await sequelize; // Wait for the database to sync
  const { schema } = await startApolloServer(app);
  // Start WebSocket server for GraphQL Subscriptions (graphql-ws)
  const { cleanup } = startGraphQLWSServer({ httpServer: server, schema, path: '/graphql' });
  wsCleanup = cleanup;

  // 404 handler
  app.use((_req, res) =>
    responseWrapper({
      res,
      status: httpCodes.NOT_FOUND,
      message: 'Contact Our Team for API Docs',
    })
  );

  server.listen(port, () => {
    // eslint-disable-next-line no-console
    logger.info(`Server is running on port ${port}`);
  });
};

startServer();

// Graceful shutdown function
const gracefulShutdown = (reason: string, exitCode = 1) => {
  logger.info(`Shutting down server gracefully. Reason: ${reason}`);

  server.close(async () => {
    logger.info('HTTP server closed');

    // Close database connections here if needed
    // e.g., sequelize.close()
    if (wsCleanup) {
      await wsCleanup.dispose();
      logger.info('WebSocket server closed');
    }

    process.exit(exitCode);
  });

  // Force shutdown after timeout if server doesn't close gracefully
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(exitCode);
  }, 10000); // 10 seconds
};

// catch unhandled errors and exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { reason, promise });
  // For unhandled rejections, you might choose to continue running
  // or shut down based on your application's requirements
  gracefulShutdown('unhandled rejection', 1);
});

// catch uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown', { error });
  // For uncaught exceptions, it's safer to shut down as the application state
  // may be compromised
  gracefulShutdown('uncaught exception', 1);
});

// Handle termination signals
process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  gracefulShutdown('SIGTERM', 0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received');
  gracefulShutdown('SIGINT', 0);
});
