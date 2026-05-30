import { BadRequestException, Injectable } from '@nestjs/common';
import { CustomerDto, EmployeeDto, OrderDto, ProductDto } from './dto/sync.dto';
import { Customer } from './entities/customer.entity';
import { Employee } from './entities/employee.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from './entities/product.entity';

@Injectable()
export class SyncMapper {
  mapCustomer(dto: CustomerDto): Customer {
    const entity = new Customer();
    if (dto.id !== undefined) entity.id = dto.id;
    entity.email = dto.email;
    entity.firstName = dto.firstName;
    entity.lastName = dto.lastName;
    entity.defaultCurrency = dto.defaultCurrency ?? 'USD';
    return entity;
  }

  mapProduct(dto: ProductDto): Product {
    const entity = new Product();
    if (dto.id !== undefined) entity.id = dto.id;
    entity.name = dto.name;
    entity.description = dto.description;
    entity.price = dto.price;
    entity.currency = dto.currency ?? 'USD';
    entity.active = dto.active ?? true;
    entity.weightGrams = dto.weightGrams;
    return entity;
  }

  mapOrder(dto: OrderDto): Order {
    const entity = new Order();
    if (dto.id !== undefined) entity.id = dto.id;
    entity.orderNumber = dto.orderNumber;

    const customer = new Customer();
    customer.id = dto.customerId;
    entity.customer = customer;

    entity.status = dto.status;
    entity.currency = dto.currency ?? 'USD';

    const items: OrderItem[] = [];
    if (dto.items && dto.items.length) {
      const invalid = dto.items.some(
        (item) => item.qty === undefined || item.unitPrice === undefined,
      );
      if (invalid) {
        throw new BadRequestException(
          'Order items must include non-null qty and unit_price',
        );
      }
      const calcAmount = dto.items.reduce(
        (sum, item) => sum + item.qty * item.unitPrice,
        0,
      );

      if (dto.amount === undefined) {
        entity.amount = calcAmount;
      } else if (dto.amount !== calcAmount) {
        throw new BadRequestException(
          `Order amount must equal the sum of item prices (qty * unit_price). Calculated=${calcAmount} provided=${dto.amount}`,
        );
      } else {
        entity.amount = dto.amount;
      }

      dto.items.forEach((itemDto) => {
        const orderItem = new OrderItem();
        if (itemDto.id !== undefined) orderItem.id = itemDto.id;
        const product = new Product();
        product.id = itemDto.productId;
        orderItem.product = product;
        orderItem.qty = itemDto.qty;
        orderItem.unitPrice = itemDto.unitPrice;
        orderItem.order = entity;
        items.push(orderItem);
      });
    } else {
      if (dto.amount === undefined) {
        throw new BadRequestException('Order must include items or an amount');
      }
      entity.amount = dto.amount;
    }

    entity.items = items;
    return entity;
  }

  mapEmployee(dto: EmployeeDto): Employee {
    const entity = new Employee();
    if (dto.id !== undefined) {
      const parsed = Number(dto.id);
      if (Number.isNaN(parsed)) {
        throw new BadRequestException('Employee id must be numeric when provided');
      }
      entity.id = parsed;
    }
    entity.employeeId = dto.employeeId;
    entity.firstName = dto.firstName;
    entity.middleName = dto.middleName;
    entity.lastName = dto.lastName;
    entity.gender = dto.gender;
    entity.email = dto.email;
    entity.phoneNumber = dto.phoneNumber;
    entity.dateOfBirth = dto.dateOfBirth;
    entity.nationality = dto.nationality;
    entity.jobLevel = dto.jobLevel;
    entity.department = dto.department;
    entity.location = dto.location;
    entity.bankAccountNumber = dto.bankAccountNumber;
    entity.company = dto.company;
    entity.jobTitle = dto.jobTitle;
    entity.costCenter = dto.costCenter;
    entity.startDate = dto.startDate;
    entity.employeeStatus = dto.employeeStatus;
    entity.managerId = dto.managerId;
    entity.managerEmail = dto.managerEmail;
    entity.lastModifiedOn = dto.lastModifiedOn;
    entity.lastModified = dto.lastModified;
    return entity;
  }
}
