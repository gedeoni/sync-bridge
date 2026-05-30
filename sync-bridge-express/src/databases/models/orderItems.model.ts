import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AllowNull,
  AutoIncrement,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import Order from './orders.model';
import Product from './products.model';

@Table({
  tableName: 'order_items',
  timestamps: false,
})
export default class OrderItem extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id!: number;

  @ForeignKey(() => Order)
  @AllowNull(false)
  @Column(DataType.BIGINT)
  order_id!: number;

  @BelongsTo(() => Order)
  order!: Order;

  @ForeignKey(() => Product)
  @AllowNull(false)
  @Column(DataType.BIGINT)
  product_id!: number;

  @BelongsTo(() => Product)
  product!: Product;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  qty!: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  unit_price!: number;

  @Column({
    type: DataType.VIRTUAL,
    get() {
      return this.getDataValue('qty') * this.getDataValue('unit_price');
    },
  })
  line_total!: number;
}
