import Fastify, { FastifyInstance } from 'fastify';
import { HTTP_PORT, HTTP_BIND_ADDRESS, MAX_CHUNK_SIZE } from '../constants';
import { registerCaptivePortalRoutes } from './captive-portal';
import { registerUploadRoutes } from '../upload/upload-routes';

let fastify: FastifyInstance | null = null;

/**
 * Starts the Fastify HTTP server on port 80.
 * Serves the captive portal and upload API.
 */
export async function startHttpServer(gatewayIp: string, portalHtml: string): Promise<void> {
  fastify = Fastify({
    logger: false,
    bodyLimit: MAX_CHUNK_SIZE + 4096, // Chunk size + header overhead
    trustProxy: false,
  });

  // Register captive portal detection routes
  registerCaptivePortalRoutes(fastify, portalHtml);

  // Register upload API routes
  registerUploadRoutes(fastify);

  // Health check
  fastify.get('/api/health', async () => ({
    status: 'ok',
    gateway: gatewayIp,
    timestamp: Date.now(),
  }));

  await fastify.listen({ port: HTTP_PORT, host: HTTP_BIND_ADDRESS });
  console.log(`[HTTP] Server listening on ${HTTP_BIND_ADDRESS}:${HTTP_PORT}`);
}

/**
 * Stops the HTTP server gracefully.
 */
export async function stopHttpServer(): Promise<void> {
  if (fastify) {
    await fastify.close();
    console.log('[HTTP] Server stopped');
    fastify = null;
  }
}

/**
 * Returns whether the HTTP server is currently running.
 */
export function isHttpRunning(): boolean {
  return fastify !== null;
}
