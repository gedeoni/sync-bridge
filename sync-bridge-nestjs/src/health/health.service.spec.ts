import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HealthService } from './health.service';
import { Customer } from '../sync/entities/customer.entity';

describe('HealthService', () => {
  let service: HealthService;

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: getRepositoryToken(Customer),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should report healthy when findOne and save succeed', async () => {
    mockRepository.findOne.mockResolvedValueOnce({});
    mockRepository.create.mockReturnValueOnce({});
    mockRepository.save.mockResolvedValueOnce({ id: 1 });
    mockRepository.remove.mockResolvedValueOnce({});

    const res = await service.healthCheck();

    expect(res.read).toBe(true);
    expect(res.write).toBe(true);
    expect(mockRepository.findOne).toHaveBeenCalled();
    expect(mockRepository.save).toHaveBeenCalled();
    expect(mockRepository.remove).toHaveBeenCalled();
  });

  it('should report read false when findOne throws error', async () => {
    mockRepository.findOne.mockRejectedValueOnce(new Error('Read failed'));
    mockRepository.create.mockReturnValueOnce({});
    mockRepository.save.mockResolvedValueOnce({ id: 1 });
    mockRepository.remove.mockResolvedValueOnce({});

    const res = await service.healthCheck();

    expect(res.read).toBe(false);
    expect(res.write).toBe(true);
  });

  it('should report write false when save throws error', async () => {
    mockRepository.findOne.mockResolvedValueOnce({});
    mockRepository.create.mockReturnValueOnce({});
    mockRepository.save.mockRejectedValueOnce(new Error('Write failed'));

    const res = await service.healthCheck();

    expect(res.read).toBe(true);
    expect(res.write).toBe(false);
  });
});
