import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SyncHistoryService } from './sync-history.service';
import { SyncHistory } from '../sync/entities/sync-history.entity';
import { SyncStatus } from '../sync/entities/sync-status.enum';

describe('SyncHistoryService', () => {
  let service: SyncHistoryService;

  const mockSyncHistoryRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncHistoryService,
        {
          provide: getRepositoryToken(SyncHistory),
          useValue: mockSyncHistoryRepo,
        },
      ],
    }).compile();

    service = module.get<SyncHistoryService>(SyncHistoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list', () => {
    it('should successfully list and count history records', async () => {
      const records = [{ id: 1, status: SyncStatus.SUCCESSFUL }];
      mockSyncHistoryRepo.findAndCount.mockResolvedValueOnce([records, 1]);

      const result = await service.list(1, 10);

      expect(result.data).toEqual(records);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.size).toBe(10);
      expect(mockSyncHistoryRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          where: {},
        }),
      );
    });

    it('should apply status filter when status query is valid', async () => {
      mockSyncHistoryRepo.findAndCount.mockResolvedValueOnce([[], 0]);

      await service.list(1, 10, 'failed');

      expect(mockSyncHistoryRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: SyncStatus.FAILED },
        }),
      );
    });

    it('should throw BadRequestException if status filter is invalid', async () => {
      await expect(service.list(1, 10, 'invalid-status')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getById', () => {
    it('should return item when found', async () => {
      const record = { id: 1, status: SyncStatus.SUCCESSFUL };
      mockSyncHistoryRepo.findOne.mockResolvedValueOnce(record);

      const result = await service.getById(1);

      expect(result).toEqual(record);
      expect(mockSyncHistoryRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should throw NotFoundException when item is not found', async () => {
      mockSyncHistoryRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.getById(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('retry', () => {
    it('should transition failed sync back to PENDING_RETRY', async () => {
      const record = { id: 1, status: SyncStatus.FAILED };
      mockSyncHistoryRepo.findOne.mockResolvedValueOnce(record);
      mockSyncHistoryRepo.save.mockImplementationOnce((val) =>
        Promise.resolve(val),
      );

      const result = await service.retry(1);

      expect(result.status).toBe(SyncStatus.PENDING_RETRY);
      expect(mockSyncHistoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: SyncStatus.PENDING_RETRY }),
      );
    });

    it('should throw BadRequestException if sync is not failed', async () => {
      const record = { id: 1, status: SyncStatus.SUCCESSFUL };
      mockSyncHistoryRepo.findOne.mockResolvedValueOnce(record);

      await expect(service.retry(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete record when found', async () => {
      const record = { id: 1, status: SyncStatus.SUCCESSFUL };
      mockSyncHistoryRepo.findOne.mockResolvedValueOnce(record);
      mockSyncHistoryRepo.remove.mockResolvedValueOnce({});

      await service.remove(1);

      expect(mockSyncHistoryRepo.remove).toHaveBeenCalledWith(record);
    });
  });
});
