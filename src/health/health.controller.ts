import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { responseWithStatus } from '../common/utils/response.util';
import { Public } from '../common/decorators/public.decorator';
import { Monitored } from '../common/decorators/monitored.decorator';

@ApiTags('Health')
@Controller('healthz')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @Monitored({ name: 'health.check' })
  @ApiOperation({ summary: 'Liveness and health check probe', description: 'Checks database connectivity (read and write operations) to ensure service health.' })
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
