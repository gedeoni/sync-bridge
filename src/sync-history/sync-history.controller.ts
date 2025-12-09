import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { SyncHistoryService } from './sync-history.service';
import { ok, responseWithStatus } from '../common/utils/response.util';
import { Monitored } from '../common/decorators/monitored.decorator';

@Controller('sync-history')
export class SyncHistoryController {
  constructor(private readonly service: SyncHistoryService) {}

  @Get()
  @Monitored({ name: 'sync_history.list', tags: ['status'] })
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
  @Monitored({ name: 'sync_history.get', tags: ['id'] })
  async get(@Param('id') id: number) {
    const item = await this.service.getById(Number(id));
    return ok('Sync history retrieved successfully', item);
  }

  @Post('retry/:id')
  @Monitored({ name: 'sync_history.retry', tags: ['id'] })
  async retry(@Param('id') id: number) {
    const item = await this.service.retry(Number(id));
    return ok('Sync history will be retried', item);
  }

  @Delete(':id')
  @Monitored({ name: 'sync_history.delete', tags: ['id'] })
  async delete(@Param('id') id: number) {
    await this.service.remove(Number(id));
    return responseWithStatus(204, 'Sync history deleted successfully');
  }
}
