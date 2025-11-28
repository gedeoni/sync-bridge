import { GraphQLSchema } from 'graphql';
import { WebSocketServer, WebSocket } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import * as http from 'http';

export interface WsCleanup {
  dispose: () => Promise<void>;
}

export function startGraphQLWSServer({
  httpServer,
  schema,
  path = '/graphql',
}: {
  httpServer: http.Server;
  schema: GraphQLSchema;
  path?: string;
}): { wss: WebSocketServer; cleanup: WsCleanup } {
  const wss = new WebSocketServer({ server: httpServer, path });
  const serverCleanup = useServer({ schema }, wss);

  const cleanup: WsCleanup = {
    async dispose() {
      await serverCleanup.dispose();
      wss.clients.forEach((client: WebSocket) => client.close());
      wss.close();
    },
  };

  return { wss, cleanup };
}
