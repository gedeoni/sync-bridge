import {
  Args,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { Inject, UsePipes, ValidationPipe } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../sync/entities/employee.entity';
import {
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from './dto/employee.input';
import { Monitored } from '../common/decorators/monitored.decorator';
import { Public } from 'src/common/decorators/public.decorator';

export const PUB_SUB = 'PUB_SUB';

@Public()
@Resolver(() => Employee)
export class EmployeeResolver {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @Inject(PUB_SUB) private readonly pubSub: PubSub,
  ) {}

  @Query(() => [Employee])
  @Monitored({ name: 'graphql.employees' })
  async employees(
    @Args('offset', { type: () => Int, nullable: true }) offset = 0,
    @Args('limit', { type: () => Int, nullable: true }) limit = 10,
  ) {
    return this.employeeRepo.find({ skip: offset, take: limit });
  }

  @Query(() => Employee, { nullable: true })
  @Monitored({ name: 'graphql.employee' })
  async employee(@Args('id', { type: () => Int }) id: number) {
    return this.employeeRepo.findOne({ where: { id } });
  }

  @Query(() => [Employee])
  @Monitored({ name: 'graphql.search_employees' })
  async searchEmployees(
    @Args('search', { type: () => String }) search: string,
    @Args('offset', { type: () => Int, nullable: true }) offset = 0,
    @Args('limit', { type: () => Int, nullable: true }) limit = 10,
  ) {
    const where = [
      { firstName: Like(`%${search}%`) },
      { lastName: Like(`%${search}%`) },
      { email: Like(`%${search}%`) },
    ];
    return this.employeeRepo.find({ where, skip: offset, take: limit });
  }

  @Mutation(() => Employee)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @Monitored({ name: 'graphql.create_employee' })
  async createEmployee(@Args('data') data: CreateEmployeeInput) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entity = this.employeeRepo.create(data as any);
    const saved = await this.employeeRepo.save(entity);
    await this.pubSub.publish('EMPLOYEE_CREATED', saved);
    return saved;
  }

  @Mutation(() => Employee, { nullable: true })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  @Monitored({ name: 'graphql.update_employee', tags: ['id'] })
  async updateEmployee(
    @Args('id', { type: () => Int }) id: number,
    @Args('data') data: UpdateEmployeeInput,
  ) {
    const entity = await this.employeeRepo.findOne({ where: { id } });
    if (!entity) return null;
    Object.assign(entity, data);
    return this.employeeRepo.save(entity);
  }

  @Mutation(() => Boolean)
  @Monitored({ name: 'graphql.delete_employee', tags: ['id'] })
  async deleteEmployee(@Args('id', { type: () => Int }) id: number) {
    const res = await this.employeeRepo.delete({ id });
    return res.affected !== null && res.affected !== undefined && res.affected > 0;
  }

  @Subscription(() => Employee, { name: 'employeeCreated' })
  @Monitored({ name: 'graphql.employee_created' })
  employeeCreated() {
    return this.pubSub.asyncIterator('EMPLOYEE_CREATED');
  }

  @ResolveField(() => String)
  fullName(@Parent() e: Employee) {
    return [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
  }
}
