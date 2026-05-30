import { ApolloServer } from 'apollo-server-express';
import { Application } from 'express';
import { createSchema } from './schema';
import { logger } from '../helpers/logger';
import { GraphQLSchema } from 'graphql';

export const startApolloServer = async (app: Application): Promise<{ server: ApolloServer; schema: GraphQLSchema }> => {
  const schema = await createSchema();

  const server = new ApolloServer({
    schema,
    context: ({ req, res }) => ({ req, res }),
    formatError: (error) => {
      logger.error('GraphQL Error:', error);
      return error;
    },
  });

  await server.start();

  server.applyMiddleware({ app: app as any, path: '/graphql' });

  logger.info('GraphQL server ready at /graphql');
  return { server, schema };
};
