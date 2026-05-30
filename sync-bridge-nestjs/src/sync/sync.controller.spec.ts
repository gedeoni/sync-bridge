import { Test, TestingModule } from '@nestjs/testing';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SyncRequestDto } from './dto/sync.dto';

describe('SyncController', () => {
  let controller: SyncController;
  let service: SyncService;

  const mockSyncService = {
    sync: jest.fn(),
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyncController],
      providers: [
        {
          provide: SyncService,
          useValue: mockSyncService,
        },
      ],
    }).compile();

    controller = module.get<SyncController>(SyncController);
    service = module.get<SyncService>(SyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate sync to SyncService', async () => {
    const payload: SyncRequestDto = { model: 'customers', data: [] };
    const serviceResult = { results: [] };
    mockSyncService.sync.mockResolvedValueOnce(serviceResult);

    const res = await controller.sync(payload);

    expect(service.sync).toHaveBeenCalledWith(payload);
    expect(res).toEqual({
      status: 200,
      message: 'Sync successful',
      data: serviceResult,
    });
  });

  it('should delegate stats to SyncService', async () => {
    const serviceResult = { total: 0 };
    mockSyncService.getStats.mockResolvedValueOnce(serviceResult);

    const res = await controller.stats();

    expect(service.getStats).toHaveBeenCalled();
    expect(res).toEqual({
      status: 200,
      message: 'Sync stats retrieved successfully',
      data: serviceResult,
    });
  });
});
