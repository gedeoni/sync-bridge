import bunyan from 'bunyan';
import { customEnv } from './customEnv';

const streams: bunyan.Stream[] = [
  {
    level: 'trace',
    stream: process.stdout,
  },
];

export const logger = bunyan.createLogger({
  name: customEnv.APP_NAME as string,
  src: true,
  streams,
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      headers: req.headers,
      remoteAddress: req.connection.remoteAddress,
      remotePort: req.connection.remotePort,
    }),
    res: bunyan.stdSerializers.res,
    err: bunyan.stdSerializers.err,
  },
});
