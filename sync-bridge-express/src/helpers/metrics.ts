import { Request, Response } from 'express';
import client from 'prom-client';

export const collectDefaultMetrics = client.collectDefaultMetrics;
export const register = client.register;

export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [50, 100, 200, 300, 400, 500, 750, 1000, 2500, 5000],
});

export async function metricsHandler(req: Request, res: Response) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}
