import { Table, Column, Model, DataType, PrimaryKey } from 'sequelize-typescript';

@Table({
  tableName: 'employees',
  timestamps: true,
})
export class Employee extends Model<Employee> {
  @PrimaryKey
  @Column(DataType.INTEGER)
  id!: number;

  @Column(DataType.STRING)
  employeeId!: string;

  @Column(DataType.STRING)
  firstName!: string;

  @Column(DataType.STRING)
  middleName!: string;

  @Column(DataType.STRING)
  lastName!: string;

  @Column(DataType.STRING)
  gender!: string;

  @Column(DataType.STRING)
  email!: string;

  @Column(DataType.STRING)
  phoneNumber!: string;

  @Column(DataType.DATE)
  dateOfBirth!: Date;

  @Column(DataType.STRING)
  nationality!: string;

  @Column(DataType.STRING)
  jobLevel!: string;

  @Column(DataType.STRING)
  department!: string;

  @Column(DataType.STRING)
  location!: string;

  @Column(DataType.STRING)
  company!: string;

  @Column(DataType.STRING)
  jobTitle!: string;

  @Column(DataType.STRING)
  costCenter!: string;

  @Column(DataType.DATE)
  startDate!: Date;

  @Column(DataType.STRING)
  employeeStatus!: string;

  @Column(DataType.STRING)
  managerId!: string;

  @Column(DataType.STRING)
  managerEmail!: string;

  @Column(DataType.DATE)
  lastModifiedOn!: Date;

  @Column(DataType.BIGINT)
  lastModified!: number;
}

export default Employee;
