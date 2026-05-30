import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  price!: number;

  @Column({ length: 3, default: 'USD' })
  currency!: string;

  @Column({ default: true })
  active!: boolean;

  @Column({ name: 'weight_grams', nullable: true })
  weightGrams?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

