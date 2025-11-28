import { buildSchema } from 'type-graphql';
import { EmployeeResolver } from './resolvers/employee.resolver';
import { pubSub } from './pubsubInstance';

export const createSchema = async () => {
  return buildSchema({
    resolvers: [EmployeeResolver],
    emitSchemaFile: true,
    validate: false,
    pubSub,
  });
};
