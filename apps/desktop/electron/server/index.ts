import 'dotenv/config';
import { serve } from '@hono/node-server';
import app from './api';

const PORT = process.env.API_PORT || 3000;

export function startServer() {
  const server = serve({
    fetch: app.fetch,
    port: Number(PORT),
  });

  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  
  return server;
}

export function stopServer(server: any) {
  if (server) {
    server.close();
    console.log('API Server stopped');
  }
}
