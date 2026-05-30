import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  Default,
  AllowNull,
  AutoIncrement,
  BelongsTo,
  ForeignKey,
  HasMany,
} from 'sequelize-typescript';
import Customer from './customers.model';
import OrderItem from './orderItems.model';

@Table({
  tableName: 'orders',
  timestamps: true,
  createdAt: 'placed_at',
  updatedAt: 'updated_at',
})
export default class Order extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id!: number;

  @AllowNull(false)
  @Column({
    type: DataType.TEXT,
    unique: true,
  })
  order_number!: string;

  @ForeignKey(() => Customer)
  @AllowNull(false)
  @Column(DataType.BIGINT)
  customer_id!: number;

  @BelongsTo(() => Customer)
  customer!: Customer;

  @HasMany(() => OrderItem)
  items!: OrderItem[];

  @AllowNull(false)
  @Column(DataType.TEXT)
  status!: string;

  @AllowNull(false)
  @Default('USD')
  @Column(DataType.CHAR(3))
  currency!: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  amount!: number;

  @CreatedAt
  placed_at!: Date;

  @UpdatedAt
  updated_at!: Date;
}
