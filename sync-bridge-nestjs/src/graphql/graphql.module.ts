import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PubSub } from 'graphql-subscriptions';
import { Employee } from '../sync/entities/employee.entity';
import { EmployeeResolver, PUB_SUB } from './employee.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      playground: true,
      subscriptions: {
        'graphql-ws': true,
      },
    }),
    TypeOrmModule.forFeature([Employee]),
  ],
  providers: [
    EmployeeResolver,
    {
      provide: PUB_SUB,
      useFactory: () => new PubSub(),
    },
  ],
})
export class GraphqlModule {}

