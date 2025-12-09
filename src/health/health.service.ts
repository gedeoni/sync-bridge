import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../sync/entities/customer.entity';

@Injectable()
export class HealthService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async healthCheck() {
    const result = { read: false, write: false, timestamp: new Date().toISOString() };

    try {
      await this.customerRepo.findOne({ where: {} });
      result.read = true;
    } catch (e) {
      result.read = false;
    }

    try {
      const temp = this.customerRepo.create({
        email: 'healthcheck@example.com',
        firstName: 'Health',
        lastName: 'Check',
        defaultCurrency: 'USD',
      });
      const saved = await this.customerRepo.save(temp);
      await this.customerRepo.remove(saved);
      result.write = true;
    } catch (e) {
      result.write = false;
    }

    return result;
  }
}

