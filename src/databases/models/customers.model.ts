import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  Default,
  IsEmail,
  AllowNull,
  AutoIncrement,
} from 'sequelize-typescript';

@Table({
  tableName: 'customers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
})
export default class Customer extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.BIGINT)
  id!: number;

  @IsEmail
  @AllowNull(false)
  @Column({
    type: DataType.TEXT,
    unique: true,
  })
  email!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  first_name!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  last_name!: string;

  @AllowNull(false)
  @Default('USD')
  @Column(DataType.CHAR(3))
  default_currency!: string;

  @Column({
    type: DataType.VIRTUAL,
    get() {
      return `${this.getDataValue('first_name')} ${this.getDataValue('last_name')}`;
    },
  })
  full_name!: string;

  @CreatedAt
  created_at!: Date;

  @UpdatedAt
  updated_at!: Date;
}
