import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncModule } from './sync/sync.module';
import { SyncHistoryModule } from './sync-history/sync-history.module';
import { HealthModule } from './health/health.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ApiKeyAuthGuard } from './common/guards/api-key-auth.guard';
import { Customer } from './sync/entities/customer.entity';
import { Product } from './sync/entities/product.entity';
import { Order } from './sync/entities/order.entity';
import { OrderItem } from './sync/entities/order-item.entity';
import { Employee } from './sync/entities/employee.entity';
import { SyncHistory } from './sync/entities/sync-history.entity';
import { MetricsService } from './common/services/metrics.service';
import { MonitoredInterceptor } from './common/interceptors/monitored.interceptor';
import { GraphqlModule } from './graphql/graphql.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'sqlite',
        database: config.get<string>('DB_PATH', 'sync-bridge.db'),
        entities: [Customer, Product, Order, OrderItem, Employee, SyncHistory],
        synchronize: config.get<string>('NODE_ENV') === 'development',
        migrations: [
          config.get<string>('NODE_ENV') === 'development'
            ? 'src/migrations/*.ts'
            : 'dist/migrations/*.js',
        ],
        migrationsRun: config.get<string>('NODE_ENV') !== 'development',
      }),
    }),
    SyncModule,
    SyncHistoryModule,
    HealthModule,
    GraphqlModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: ApiKeyAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: MonitoredInterceptor },
    MetricsService,
  ],
})
export class AppModule {}
