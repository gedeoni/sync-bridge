import express from 'express';
import { MainRoutes } from './routes/main.routes';
import { responseWrapper } from './helpers/responseWrapper';
import httpCodes from './constants/httpCodes';
import { errorHandler } from './middlewares/errors';
import { collectDefaultMetrics, httpRequestDurationMicroseconds } from './helpers/metrics';
import { requestIdMiddleware } from './middlewares/requestId';
import { logger } from './helpers/logger';

const app = express();

// Collect default metrics
collectDefaultMetrics();

app.use(express.json({ limit: '5mb' }));

app.use(express.urlencoded({ extended: true }));

// Add request ID to all requests
app.use(requestIdMiddleware);

// Middleware to measure request duration
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route ? req.route.path : req.path, code: res.statusCode });
    logger.info({ req, res }, 'Request finished');
  });
  next();
});

const mainRoutes = new MainRoutes().router;

app.use(`/api/v1`, mainRoutes);

import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger';

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((_req, res) =>
  responseWrapper({
    res,
    status: httpCodes.NOT_FOUND,
    message: 'Contact Our Team for API Docs',
  })
);

app.use(errorHandler);

export default app;
