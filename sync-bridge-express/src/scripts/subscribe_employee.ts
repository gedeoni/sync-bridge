/* eslint-disable no-console */
import { createClient, Client } from 'graphql-ws';

// Usage:
//   APP_PORT=4007 ts-node src/scripts/subscribe_employee.ts
// or set GRAPHQL_WS_URL directly:
//   GRAPHQL_WS_URL=ws://localhost:4007/graphql ts-node src/scripts/subscribe_employee.ts

const url = process.env.GRAPHQL_WS_URL ?? `ws://localhost:${process.env.APP_PORT || 4007}/graphql`;

console.log(`Connecting to GraphQL WS at: ${url}`);

const client: Client = createClient({ url });

const SUBSCRIPTION = /* GraphQL */ `
  subscription {
    employeeCreated {
      id
      firstName
      lastName
      email
      fullName
    }
  }
`;

client.subscribe(
  {
    query: SUBSCRIPTION,
  },
  {
    next: (data) => console.log('Subscription event:', JSON.stringify(data, null, 2)),
    error: (err) => console.error('Subscription error:', err),
    complete: () => console.log('Subscription completed'),
  }
);
