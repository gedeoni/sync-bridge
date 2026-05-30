import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncMapper } from './sync.mapper';
import { Customer } from './entities/customer.entity';
import { Product } from './entities/product.entity';
import { Order } from './entities/order.entity';
import { Employee } from './entities/employee.entity';
import { SyncHistory } from './entities/sync-history.entity';
import { SyncRequestDto } from './dto/sync.dto';
import { SyncStatus } from './entities/sync-status.enum';

describe('SyncService', () => {
  let service: SyncService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let customerRepo: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let syncHistoryRepo: any;

  const mockRepoFactory = () => ({
    create: jest.fn((val) => val),
    save: jest.fn((val) => Promise.resolve({ id: 1, ...val })),
  });

  const mockHistoryRepo = {
    create: jest.fn((val) => val),
    save: jest.fn((val) => Promise.resolve({ id: 123, ...val })),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { status: SyncStatus.SUCCESSFUL, count: '10' },
        { status: SyncStatus.FAILED, count: '2' },
      ]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        SyncMapper,
        { provide: getRepositoryToken(Customer), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Product), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Order), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Employee), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(SyncHistory), useValue: mockHistoryRepo },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    customerRepo = module.get(getRepositoryToken(Customer));
    syncHistoryRepo = module.get(getRepositoryToken(SyncHistory));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sync', () => {
    it('should successfully sync customers and set history status to SUCCESSFUL', async () => {
      const payload: SyncRequestDto = {
        model: 'customers',
        data: [
          {
            email: 'john.doe@example.com',
            first_name: 'John',
            last_name: 'Doe',
            default_currency: 'USD',
          },
        ],
      };

      const result = await service.sync(payload);

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({ id: 1, status: 'created' });
      expect(customerRepo.save).toHaveBeenCalled();
      expect(syncHistoryRepo.save).toHaveBeenCalledTimes(2); // Initial save (pending) + success save
      expect(syncHistoryRepo.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: SyncStatus.SUCCESSFUL }),
      );
    });

    it('should successfully sync products', async () => {
      const payload: SyncRequestDto = {
        model: 'products',
        data: [
          {
            name: 'Sample Product',
            price: 99.9,
            currency: 'USD',
          },
        ],
      };

      const result = await service.sync(payload);
      expect(result.results[0].status).toBe('created');
    });

    it('should successfully sync orders', async () => {
      const payload: SyncRequestDto = {
        model: 'orders',
        data: [
          {
            order_number: 'ORD-12345',
            customer_id: 1,
            status: 'pending',
            currency: 'USD',
            amount: 150.0,
          },
        ],
      };

      const result = await service.sync(payload);
      expect(result.results[0].status).toBe('created');
    });

    it('should successfully sync employees', async () => {
      const payload: SyncRequestDto = {
        model: 'employees',
        data: [
          {
            employeeId: 'EMP001',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
          },
        ],
      };

      const result = await service.sync(payload);
      expect(result.results[0].status).toBe('created');
    });

    it('should throw BadRequestException and set history to FAILED when payload validation fails', async () => {
      const payload: SyncRequestDto = {
        model: 'customers',
        data: [
          {
            email: 'invalid-email', // Should trigger class-validator IsEmail failure
            first_name: '',
          },
        ],
      };

      await expect(service.sync(payload)).rejects.toThrow(BadRequestException);
      expect(syncHistoryRepo.save).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: SyncStatus.FAILED,
          failureReason: expect.any(String),
        }),
      );
    });

    it('should set history to INVALID if model config is missing', async () => {
      const payload = {
        model: 'invalid-model',
        data: [{ id: 1 }],
      } as unknown as SyncRequestDto;

      await expect(service.sync(payload)).rejects.toThrow(BadRequestException);
      expect(syncHistoryRepo.save).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: SyncStatus.INVALID,
          failureReason: 'Invalid model: invalid-model',
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should aggregate history status counts correctly', async () => {
      const stats = await service.getStats();

      expect(stats).toEqual({
        [SyncStatus.SUCCESSFUL]: 10,
        [SyncStatus.FAILED]: 2,
        total: 12,
      });
    });
  });
});
