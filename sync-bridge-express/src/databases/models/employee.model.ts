import { Table, Column, Model, DataType, PrimaryKey } from 'sequelize-typescript';
import { ObjectType, Field, Int } from 'type-graphql';

@ObjectType()
@Table({
  tableName: 'employees',
  timestamps: true,
})
export class Employee extends Model<Employee> {
  @Field(() => Int)
  @PrimaryKey
  @Column(DataType.INTEGER)
  id!: number;

  @Field()
  @Column(DataType.STRING)
  employeeId!: string;

  @Field()
  @Column(DataType.STRING)
  firstName!: string;

  @Field({ nullable: true })
  @Column(DataType.STRING)
  middleName!: string;

  @Field()
  @Column(DataType.STRING)
  lastName!: string;

  @Field()
  @Column(DataType.STRING)
  gender!: string;

  @Field()
  @Column(DataType.STRING)
  email!: string;

  @Field({ nullable: true })
  @Column(DataType.STRING)
  phoneNumber!: string;

  @Field()
  @Column(DataType.DATE)
  dateOfBirth!: Date;

  @Field()
  @Column(DataType.STRING)
  nationality!: string;

  @Field({ nullable: true })
  @Column(DataType.STRING)
  jobLevel!: string;

  @Field()
  @Column(DataType.STRING)
  department!: string;

  @Field()
  @Column(DataType.STRING)
  location!: string;

  @Field()
  @Column(DataType.STRING)
  company!: string;

  @Field()
  @Column(DataType.STRING)
  jobTitle!: string;

  @Field()
  @Column(DataType.STRING)
  costCenter!: string;

  @Field()
  @Column(DataType.DATE)
  startDate!: Date;

  @Field()
  @Column(DataType.STRING)
  employeeStatus!: string;

  @Field({ nullable: true })
  @Column(DataType.STRING)
  managerId!: string;

  @Field({ nullable: true })
  @Column(DataType.STRING)
  managerEmail!: string;

  @Field()
  @Column(DataType.DATE)
  lastModifiedOn!: Date;

  @Field()
  @Column(DataType.BIGINT)
  lastModified!: number;
}

export default Employee;
