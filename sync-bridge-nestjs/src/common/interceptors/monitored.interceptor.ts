import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { randomUUID } from 'crypto';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { MetricsService } from '../services/metrics.service';
import {
  MONITORED_METADATA,
  MonitoredOptions,
} from '../decorators/monitored.decorator';

@Injectable()
export class MonitoredInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MonitoredInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly metrics: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.getAllAndOverride<MonitoredOptions | undefined>(
      MONITORED_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (!options) return next.handle();

    const startedAt = process.hrtime.bigint();
    const timestamp = new Date().toISOString();
    const req = this.getRequest(context);
    const requestId = this.ensureRequestId(req);
    const tags = this.extractTags(req, options.tags ?? [], context);

    this.logger.log(
      JSON.stringify({
        type: 'metric_start',
        name: options.name,
        requestId,
        tags,
        timestamp,
      }),
    );

    return next.handle().pipe(
      tap(() => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        this.metrics.record({
          name: options.name,
          status: 'success',
          tags,
          durationMs,
          timestamp,
        });
        this.logger.log(
          JSON.stringify({
            type: 'metric_end',
            name: options.name,
            status: 'success',
            durationMs: Number(durationMs.toFixed(2)),
            requestId,
            tags,
            timestamp,
          }),
        );
      }),
      catchError((err) => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        this.metrics.record({
          name: options.name,
          status: 'error',
          exception: err?.constructor?.name ?? 'Error',
          tags,
          durationMs,
          timestamp,
        });
        this.logger.error(
          JSON.stringify({
            type: 'metric_end',
            name: options.name,
            status: 'error',
            durationMs: Number(durationMs.toFixed(2)),
            requestId,
            tags,
            exception: err?.message,
            timestamp,
          }),
        );
        return throwError(() => err);
      }),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractTags(req: any, tagNames: string[], context: ExecutionContext) {
    const tags: Record<string, string> = {};
    if (!tagNames.length) return tags;

    let gqlArgs: Record<string, unknown> | undefined;
    if (context.getType().toString() === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      gqlArgs = gqlCtx.getArgs();
    }

    tagNames.forEach((name) => {
      const val =
        req?.body?.[name] ??
        req?.params?.[name] ??
        req?.query?.[name] ??
        (gqlArgs ? gqlArgs[name] : undefined);
      if (val !== undefined) {
        tags[name] = String(val);
      }
    });
    return tags;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ensureRequestId(req: any) {
    const existing = req?.headers?.['x-request-id'];
    const id = existing || randomUUID();
    if (req?.headers) {
      req.headers['x-request-id'] = id;
    }
    return id;
  }

  private getRequest(context: ExecutionContext) {
    if (context.getType().toString() === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      const ctx = gqlCtx.getContext();
      return ctx?.req || ctx?.request;
    }
    return context.switchToHttp().getRequest();
  }
}
