import { SetMetadata } from '@nestjs/common';

export const MONITORED_METADATA = 'monitored_options';

export type MonitoredOptions = {
  name: string;
  tags?: string[];
};

export const Monitored = (options: MonitoredOptions) =>
  SetMetadata(MONITORED_METADATA, options);

