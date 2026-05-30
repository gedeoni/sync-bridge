import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;

  const mockHealthService = {
    healthCheck: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return 200 status when healthy', async () => {
    const healthResult = { read: true, write: true, timestamp: 'now' };
    mockHealthService.healthCheck.mockResolvedValueOnce(healthResult);

    const res = await controller.health();

    expect(res.status).toBe(200);
    expect(res.message).toBe('Service is healthy');
    expect(res.data).toEqual(healthResult);
  });

  it('should return 503 status when unhealthy (read fails)', async () => {
    const healthResult = { read: false, write: true, timestamp: 'now' };
    mockHealthService.healthCheck.mockResolvedValueOnce(healthResult);

    const res = await controller.health();

    expect(res.status).toBe(503);
    expect(res.message).toBe('Service is unhealthy');
    expect(res.data).toEqual(healthResult);
  });

  it('should return 503 status when unhealthy (write fails)', async () => {
    const healthResult = { read: true, write: false, timestamp: 'now' };
    mockHealthService.healthCheck.mockResolvedValueOnce(healthResult);

    const res = await controller.health();

    expect(res.status).toBe(503);
    expect(res.message).toBe('Service is unhealthy');
    expect(res.data).toEqual(healthResult);
  });
});
