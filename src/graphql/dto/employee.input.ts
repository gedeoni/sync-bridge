import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateEmployeeInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  id?: number;

  @Field()
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @Field()
  @IsEmail()
  email!: string;

  @Field({ nullable: true })
  @IsOptional()
  middleName?: string;

  @Field({ nullable: true })
  @IsOptional()
  company?: string;

  @Field({ nullable: true })
  @IsOptional()
  jobTitle?: string;
}

@InputType()
export class UpdateEmployeeInput {
  @Field({ nullable: true })
  @IsOptional()
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  lastName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  middleName?: string;

  @Field({ nullable: true })
  @IsOptional()
  company?: string;

  @Field({ nullable: true })
  @IsOptional()
  jobTitle?: string;
}

