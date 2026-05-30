import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncHistory } from '../sync/entities/sync-history.entity';
import { SyncStatus } from '../sync/entities/sync-status.enum';

@Injectable()
export class SyncHistoryService {
  constructor(
    @InjectRepository(SyncHistory)
    private readonly repo: Repository<SyncHistory>,
  ) {}

  async list(page = 1, size = 15, status?: string) {
    const skip = Math.max(page - 1, 0) * size;
    const where = status
      ? { status: this.parseStatus(status) }
      : {};

    const [data, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: size,
    });

    return {
      data,
      page,
      size,
      total,
    };
  }

  async getById(id: number) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Sync history not found');
    return item;
  }

  async retry(id: number) {
    const history = await this.getById(id);
    if (history.status !== SyncStatus.FAILED) {
      throw new BadRequestException('Only failed syncs can be retried');
    }
    history.status = SyncStatus.PENDING_RETRY;
    return this.repo.save(history);
  }

  async remove(id: number) {
    const history = await this.getById(id);
    await this.repo.remove(history);
  }

  private parseStatus(value: string): SyncStatus {
    const normalized = value.toLowerCase();
    const match = (Object.values(SyncStatus) as string[]).find(
      (v) => v === normalized,
    );
    if (!match) {
      throw new BadRequestException('Invalid status');
    }
    return match as SyncStatus;
  }
}

