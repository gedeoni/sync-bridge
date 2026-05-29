import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ObjectType()
@Entity('employees')
export class Employee {
  @Field()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column()
  employeeId!: string;

  @Field()
  @Column()
  firstName!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  middleName?: string;

  @Field()
  @Column()
  lastName!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  gender?: string;

  @Field()
  @Column({ unique: true })
  email!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  phoneNumber?: string;

  @Field({ nullable: true })
  @Column({ type: 'datetime', nullable: true })
  dateOfBirth?: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  nationality?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  jobLevel?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  department?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  location?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  bankAccountNumber?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  company?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  jobTitle?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  costCenter?: string;

  @Field({ nullable: true })
  @Column({ type: 'datetime', nullable: true })
  startDate?: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  employeeStatus?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  managerId?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  managerEmail?: string;

  @Field({ nullable: true })
  @Column({ type: 'datetime', nullable: true })
  lastModifiedOn?: Date;

  @Field({ nullable: true })
  @Column({ type: 'bigint', nullable: true })
  lastModified?: number;

  @Field(() => String)
  get fullName(): string {
    return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
  }
}
