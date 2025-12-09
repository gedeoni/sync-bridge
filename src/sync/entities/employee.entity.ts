import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('employees')
export class Employee {
  @PrimaryColumn({ type: 'integer' })
  id!: number;

  @Column()
  employeeId!: string;

  @Column()
  firstName!: string;

  @Column({ nullable: true })
  middleName?: string;

  @Column()
  lastName!: string;

  @Column({ nullable: true })
  gender?: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ type: 'datetime', nullable: true })
  dateOfBirth?: Date;

  @Column({ nullable: true })
  nationality?: string;

  @Column({ nullable: true })
  jobLevel?: string;

  @Column({ nullable: true })
  department?: string;

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true })
  bankAccountNumber?: string;

  @Column({ nullable: true })
  company?: string;

  @Column({ nullable: true })
  jobTitle?: string;

  @Column({ nullable: true })
  costCenter?: string;

  @Column({ type: 'datetime', nullable: true })
  startDate?: Date;

  @Column({ nullable: true })
  employeeStatus?: string;

  @Column({ nullable: true })
  managerId?: string;

  @Column({ nullable: true })
  managerEmail?: string;

  @Column({ type: 'datetime', nullable: true })
  lastModifiedOn?: Date;

  @Column({ type: 'bigint', nullable: true })
  lastModified?: number;
}

