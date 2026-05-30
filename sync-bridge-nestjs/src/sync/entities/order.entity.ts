import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_number', unique: true })
  orderNumber!: string;

  @ManyToOne(() => Customer, { eager: true })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: true,
    orphanedRowAction: 'delete',
  })
  items!: OrderItem[];

  @Column()
  status!: string;

  @Column({ length: 3, default: 'USD' })
  currency!: string;

  @Column()
  amount!: number;

  @CreateDateColumn({ name: 'placed_at' })
  placedAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

