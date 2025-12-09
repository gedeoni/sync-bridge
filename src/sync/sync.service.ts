import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CustomerDto,
  EmployeeDto,
  OrderDto,
  ProductDto,
  BaseSyncDto,
  SyncModel,
  SyncRequestDto,
} from './dto/sync.dto';
import { Customer } from './entities/customer.entity';
import { Employee } from './entities/employee.entity';
import { Order } from './entities/order.entity';
import { Product } from './entities/product.entity';
import { SyncHistory } from './entities/sync-history.entity';
import { SyncStatus } from './entities/sync-status.enum';
import { SyncMapper } from './sync.mapper';

type Constructor<T> = new () => T;

type ModelConfig<TDto, TEntity extends ObjectLiteral> = {
  dto: Constructor<TDto>;
  map: (dto: TDto) => TEntity;
  repo: Repository<TEntity>;
};

@Injectable()
export class SyncService {
  private readonly configs: Record<SyncModel, ModelConfig<BaseSyncDto, ObjectLiteral>>;

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  @InjectRepository(Employee)
  private readonly employeeRepo: Repository<Employee>,
  @InjectRepository(SyncHistory)
  private readonly syncHistoryRepo: Repository<SyncHistory>,
  private readonly mapper: SyncMapper,
) {
  this.configs = {
    customers: {
      dto: CustomerDto,
      map: (dto) => this.mapper.mapCustomer(dto as CustomerDto),
      repo: this.customerRepo,
    },
    products: {
      dto: ProductDto,
      map: (dto) => this.mapper.mapProduct(dto as ProductDto),
      repo: this.productRepo,
    },
    orders: {
      dto: OrderDto,
      map: (dto) => this.mapper.mapOrder(dto as OrderDto),
      repo: this.orderRepo,
    },
    employees: {
      dto: EmployeeDto,
      map: (dto) => this.mapper.mapEmployee(dto as EmployeeDto),
      repo: this.employeeRepo,
    },
  };
}

  async sync(payload: SyncRequestDto) {
    const syncHistory = await this.syncHistoryRepo.save(
      this.syncHistoryRepo.create({
        payload: JSON.stringify(payload.data),
        status: SyncStatus.PENDING_RETRY,
      }),
    );

    const config = this.configs[payload.model];
    if (!config) {
      await this.syncHistoryRepo.save({
        ...syncHistory,
        status: SyncStatus.INVALID,
        failureReason: `Invalid model: ${payload.model}`,
      });
      throw new BadRequestException(`Invalid model: ${payload.model}`);
    }

    try {
      const results = [] as Array<{ id: number | string | null; status: string }>;

      for (const item of payload.data) {
        const dto = plainToInstance(config.dto, item, {
          enableImplicitConversion: true,
        });
        await this.validateDto(dto);

        const entity = config.map(dto);
        const saved = await config.repo.save(entity);

        const id = (saved as any).id ?? null;
        results.push({ id, status: (dto as any).id ? 'updated' : 'created' });
      }

      await this.syncHistoryRepo.save({
        ...syncHistory,
        status: SyncStatus.SUCCESSFUL,
      });

      return { results };
    } catch (error) {
      await this.syncHistoryRepo.save({
        ...syncHistory,
        status: SyncStatus.FAILED,
        failureReason: (error as Error).message?.slice(0, 500),
      });
      throw error;
    }
  }

  async getStats() {
    const rows = await this.syncHistoryRepo
      .createQueryBuilder('history')
      .select('history.status', 'status')
      .addSelect('COUNT(1)', 'count')
      .groupBy('history.status')
      .getRawMany<{ status: SyncStatus; count: string }>();

    const summary: Record<string, number> = {};
    let total = 0;

    rows.forEach((row) => {
      const count = Number(row.count);
      summary[row.status] = count;
      total += count;
    });

    summary.total = total;
    return summary;
  }

  private async validateDto<T>(dto: T) {
    const errors = await validate(dto as object, { whitelist: true });
    if (errors.length) {
      const formatted = errors.reduce<Record<string, string>>((acc, err) => {
        const constraint = err.constraints ? Object.values(err.constraints)[0] : undefined;
        acc[err.property] = constraint || 'Invalid value';
        return acc;
      }, {});

      throw new BadRequestException({
        status: 400,
        message: 'Validation failed for one of the items in the data array.',
        errors: formatted,
      });
    }
  }
}
