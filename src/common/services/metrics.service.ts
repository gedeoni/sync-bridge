import { Injectable, Logger } from '@nestjs/common';

type MetricKey = string;

export type MetricRecord = {
  name: string;
  status: 'success' | 'error';
  exception?: string;
  tags: Record<string, string>;
  durationMs: number;
  timestamp: string;
};

@Injectable()
export class MetricsService {
  private readonly logger = new Logger('Metrics');
  private readonly counters = new Map<MetricKey, number>();
  private readonly durations = new Map<MetricKey, number[]>();

  record(metric: MetricRecord) {
    const key = this.key(metric.name, metric.status, metric.tags, metric.exception);
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1);
    const durKey = this.key(`${metric.name}.duration`, metric.status, metric.tags, metric.exception);
    const list = this.durations.get(durKey) ?? [];
    list.push(metric.durationMs);
    this.durations.set(durKey, list);

    this.logger.log(
      JSON.stringify({
        type: 'metric',
        name: metric.name,
        status: metric.status,
        exception: metric.exception,
        tags: metric.tags,
        durationMs: Number(metric.durationMs.toFixed(2)),
        timestamp: metric.timestamp,
      }),
    );
  }

  snapshot() {
    return {
      counters: Object.fromEntries(this.counters.entries()),
      durations: Object.fromEntries(this.durations.entries()),
    };
  }

  private key(
    name: string,
    status: MetricRecord['status'],
    tags: Record<string, string>,
    exception?: string,
  ) {
    const tagStr = Object.entries(tags)
      .map(([k, v]) => `${k}:${v}`)
      .sort()
      .join('|');
    return `${name}|${status}|${exception ?? 'none'}|${tagStr}`;
  }
}

