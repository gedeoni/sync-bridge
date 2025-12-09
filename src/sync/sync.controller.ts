import { Body, Controller, Get, Post } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncRequestDto } from './dto/sync.dto';
import { ok } from '../common/utils/response.util';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  async sync(@Body() payload: SyncRequestDto) {
    const result = await this.syncService.sync(payload);
    return ok('Sync successful', result);
  }

  @Get('stats')
  async stats() {
    const stats = await this.syncService.getStats();
    return ok('Sync stats retrieved successfully', stats);
  }
}

