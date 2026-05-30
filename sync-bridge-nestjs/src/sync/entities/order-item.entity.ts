import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from './order.entity';
import { Product } from './product.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  order!: Order;

  @ManyToOne(() => Product, { eager: true })
  product!: Product;

  @Column()
  qty!: number;

  @Column({ name: 'unit_price' })
  unitPrice!: number;
}

