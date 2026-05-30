import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { SyncRequestDto } from './dto/sync.dto';
import { ok } from '../common/utils/response.util';
import { Monitored } from '../common/decorators/monitored.decorator';

@ApiTags('Sync')
@ApiSecurity('x-auth-token')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  @Monitored({ name: 'sync.operation', tags: ['model'] })
  @ApiOperation({ summary: 'Sync data to the database', description: 'Synchronize payload data for a specific model (customers, products, orders, employees).' })
  async sync(@Body() payload: SyncRequestDto) {
    const result = await this.syncService.sync(payload);
    return ok('Sync successful', result);
  }

  @Get('stats')
  @Monitored({ name: 'sync.stats' })
  @ApiOperation({ summary: 'Get synchronization statistics', description: 'Retrieve total counts and database details for synced tables.' })
  async stats() {
    const stats = await this.syncService.getStats();
    return ok('Sync stats retrieved successfully', stats);
  }
}
