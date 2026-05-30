import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncHistory } from '../sync/entities/sync-history.entity';
import { SyncHistoryService } from './sync-history.service';
import { SyncHistoryController } from './sync-history.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SyncHistory])],
  providers: [SyncHistoryService],
  controllers: [SyncHistoryController],
})
export class SyncHistoryModule {}

