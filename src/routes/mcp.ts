import { createFileRoute } from '@tanstack/react-router';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import { createTriangleMcpServer } from '../../mcp/server';

async function handleMcpRequest(request: Request) {
   const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
   });
   const server = createTriangleMcpServer();

   await server.connect(transport);
   return transport.handleRequest(request);
}

export const Route = createFileRoute('/mcp')({
   server: {
      handlers: {
         GET: ({ request }) => handleMcpRequest(request),
         POST: ({ request }) => handleMcpRequest(request),
         DELETE: ({ request }) => handleMcpRequest(request),
      },
   },
});
