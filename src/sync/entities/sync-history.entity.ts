import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SyncStatus } from './sync-status.enum';

@Entity('sync_history')
export class SyncHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  payload!: string;

  @Column({ type: 'varchar', length: 32, default: SyncStatus.PENDING_RETRY })
  status: SyncStatus = SyncStatus.PENDING_RETRY;

  @Column({ name: 'failure_reason', nullable: true })
  failureReason?: string;

  @Column({ default: 0 })
  retries: number = 0;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

