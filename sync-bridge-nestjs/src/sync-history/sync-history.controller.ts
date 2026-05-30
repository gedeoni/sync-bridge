import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { SyncHistoryService } from './sync-history.service';
import { ok, responseWithStatus } from '../common/utils/response.util';
import { Monitored } from '../common/decorators/monitored.decorator';

@ApiTags('Sync History')
@ApiSecurity('x-auth-token')
@Controller('sync-history')
export class SyncHistoryController {
  constructor(private readonly service: SyncHistoryService) {}

  @Get()
  @Monitored({ name: 'sync_history.list', tags: ['status'] })
  @ApiOperation({ summary: 'List synchronization history', description: 'Retrieve a paginated list of all synchronization operations.' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'size', required: false, type: Number, description: 'Items per page (default: 15)' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status (success/failed)' })
  async list(
    @Query('page') page?: number,
    @Query('size') size?: number,
    @Query('status') status?: string,
  ) {
    const parsedPage = page ? Number(page) : 1;
    const parsedSize = size ? Number(size) : 15;
    const data = await this.service.list(parsedPage, parsedSize, status);
    return ok('Sync histories retrieved successfully', data);
  }

  @Get(':id')
  @Monitored({ name: 'sync_history.get' })
  @ApiOperation({ summary: 'Get synchronization history item by ID', description: 'Retrieve full details of a specific sync operation.' })
  @ApiParam({ name: 'id', type: Number, description: 'Sync history item ID' })
  async get(@Param('id') id: number) {
    const item = await this.service.getById(Number(id));
    return ok('Sync history retrieved successfully', item);
  }

  @Post('retry/:id')
  @Monitored({ name: 'sync_history.retry' })
  @ApiOperation({ summary: 'Retry a failed synchronization', description: 'Re-trigger a previously failed sync history record.' })
  @ApiParam({ name: 'id', type: Number, description: 'Sync history item ID' })
  async retry(@Param('id') id: number) {
    const item = await this.service.retry(Number(id));
    return ok('Sync history will be retried', item);
  }

  @Delete(':id')
  @Monitored({ name: 'sync_history.delete' })
  @ApiOperation({ summary: 'Delete synchronization history item', description: 'Remove a sync history record from the database.' })
  @ApiParam({ name: 'id', type: Number, description: 'Sync history item ID' })
  async delete(@Param('id') id: number) {
    await this.service.remove(Number(id));
    return responseWithStatus(204, 'Sync history deleted successfully');
  }
}
