import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { Customer } from './entities/customer.entity';
import { Product } from './entities/product.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Employee } from './entities/employee.entity';
import { SyncHistory } from './entities/sync-history.entity';
import { SyncMapper } from './sync.mapper';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      Product,
      Order,
      OrderItem,
      Employee,
      SyncHistory,
    ]),
  ],
  controllers: [SyncController],
  providers: [SyncService, SyncMapper],
  exports: [SyncService],
})
export class SyncModule {}
