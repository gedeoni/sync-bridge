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
} from 'sequelize-typescript';

@Table({
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export default class Product extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id!: number;

  @AllowNull(false)
  @Column(DataType.TEXT)
  name!: string;

  @Column(DataType.TEXT)
  description!: string;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  price!: number;

  @AllowNull(false)
  @Default('USD')
  @Column(DataType.CHAR(3))
  currency!: string;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  active!: boolean;

  @Column(DataType.INTEGER)
  weight_grams!: number;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;
}
