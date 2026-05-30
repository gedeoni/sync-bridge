import { Test, TestingModule } from '@nestjs/testing';
import { SyncHistoryController } from './sync-history.controller';
import { SyncHistoryService } from './sync-history.service';

describe('SyncHistoryController', () => {
  let controller: SyncHistoryController;
  let service: SyncHistoryService;

  const mockSyncHistoryService = {
    list: jest.fn(),
    getById: jest.fn(),
    retry: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncHistoryController],
      providers: [
        {
          provide: SyncHistoryService,
          useValue: mockSyncHistoryService,
        },
      ],
    }).compile();

    controller = module.get<SyncHistoryController>(SyncHistoryController);
    service = module.get<SyncHistoryService>(SyncHistoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should list and format results correctly', async () => {
    const serviceResult = { data: [], total: 0, page: 1, size: 15 };
    mockSyncHistoryService.list.mockResolvedValueOnce(serviceResult);

    const res = await controller.list(1, 15, 'success');

    expect(service.list).toHaveBeenCalledWith(1, 15, 'success');
    expect(res).toEqual({
      status: 200,
      message: 'Sync histories retrieved successfully',
      data: serviceResult,
    });
  });

  it('should fetch item by ID and format response', async () => {
    const record = { id: 10 };
    mockSyncHistoryService.getById.mockResolvedValueOnce(record);

    const res = await controller.get(10);

    expect(service.getById).toHaveBeenCalledWith(10);
    expect(res).toEqual({
      status: 200,
      message: 'Sync history retrieved successfully',
      data: record,
    });
  });

  it('should retry record and format response', async () => {
    const record = { id: 10, status: 'pending_retry' };
    mockSyncHistoryService.retry.mockResolvedValueOnce(record);

    const res = await controller.retry(10);

    expect(service.retry).toHaveBeenCalledWith(10);
    expect(res).toEqual({
      status: 200,
      message: 'Sync history will be retried',
      data: record,
    });
  });

  it('should delete record and format response', async () => {
    mockSyncHistoryService.remove.mockResolvedValueOnce(undefined);

    const res = await controller.delete(10);

    expect(service.remove).toHaveBeenCalledWith(10);
    expect(res).toEqual({
      status: 204,
      message: 'Sync history deleted successfully',
    });
  });
});
