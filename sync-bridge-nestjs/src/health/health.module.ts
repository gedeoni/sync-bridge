import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';
import { Customer } from '../sync/entities/customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customer])],
  providers: [HealthService],
  controllers: [HealthController],
})
export class HealthModule {}

