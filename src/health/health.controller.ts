import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { responseWithStatus } from '../common/utils/response.util';
import { Public } from '../common/decorators/public.decorator';
import { Monitored } from '../common/decorators/monitored.decorator';

@Controller('healthz')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @Monitored({ name: 'health.check' })
  async health() {
    const res = await this.healthService.healthCheck();
    const ok = Boolean(res.read) && Boolean(res.write);
    return responseWithStatus(
      ok ? 200 : 503,
      ok ? 'Service is healthy' : 'Service is unhealthy',
      res,
    );
  }
}
