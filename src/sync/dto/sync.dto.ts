import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Expose, Type } from 'class-transformer';

export type SyncModel = 'customers' | 'products' | 'orders' | 'employees';

export abstract class BaseSyncDto {}

export class SyncRequestDto {
  @IsNotEmpty()
  @Matches(/^(customers|products|orders|employees)$/)
  model!: SyncModel;

  @IsArray()
  @ArrayMinSize(1)
  data!: Record<string, unknown>[];
}

export class CustomerDto extends BaseSyncDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  id?: number;

  @IsEmail()
  email!: string;

  @Expose({ name: 'first_name' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @Expose({ name: 'last_name' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @Expose({ name: 'default_currency' })
  @IsOptional()
  @Length(3, 3)
  defaultCurrency?: string;
}

export class ProductDto extends BaseSyncDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  id?: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  price!: number;

  @IsOptional()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @Expose({ name: 'weight_grams' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weightGrams?: number;
}

export class OrderItemDto extends BaseSyncDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  id?: number;

  @Expose({ name: 'product_id' })
  @Type(() => Number)
  @IsNumber()
  productId!: number;

  @Type(() => Number)
  @IsNumber()
  qty!: number;

  @Expose({ name: 'unit_price' })
  @Type(() => Number)
  @IsNumber()
  unitPrice!: number;
}

export class OrderDto extends BaseSyncDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  id?: number;

  @Expose({ name: 'order_number' })
  @IsString()
  @IsNotEmpty()
  orderNumber!: string;

  @Expose({ name: 'customer_id' })
  @Type(() => Number)
  @IsNumber()
  customerId!: number;

  @IsString()
  @Matches(/^(pending|paid|shipped|completed|cancelled|refunded)$/)
  status!: string;

  @IsOptional()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items?: OrderItemDto[];
}

export class EmployeeDto extends BaseSyncDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @Type(() => Date)
  dateOfBirth?: Date;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  jobLevel?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  costCenter?: string;

  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsString()
  employeeStatus?: string;

  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsEmail()
  managerEmail?: string;

  @IsOptional()
  @Type(() => Date)
  lastModifiedOn?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lastModified?: number;
}
