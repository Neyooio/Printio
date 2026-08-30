import { FastifyInstance } from 'fastify';

/**
 * Registers captive portal probe interception routes.
 * These routes handle the automatic detection probes that mobile/desktop OS
 * send when connecting to a Wi-Fi network to check for internet access.
 */
export function registerCaptivePortalRoutes(fastify: FastifyInstance, portalHtml: string): void {

  // ── Android / Chrome ──────────────────────────────────────────
  // Android sends GET /generate_204 expecting a 204.
  // Returning 302 triggers the captive portal browser.
  fastify.get('/generate_204', async (_request, reply) => {
    reply.status(302).redirect('/');
  });

  fastify.get('/gen_204', async (_request, reply) => {
    reply.status(302).redirect('/');
  });

  // Some Android devices also hit these Google connectivity URLs
  fastify.get('/connectivity-check.html', async (_request, reply) => {
    reply.status(302).redirect('/');
  });

  // ── Apple iOS / macOS ─────────────────────────────────────────
  // Apple devices request /hotspot-detect.html and check for a specific response.
  // Returning our portal page directly causes the CNA (Captive Network Assistant) to show it.
  fastify.get('/hotspot-detect.html', async (_request, reply) => {
    reply.type('text/html').send(portalHtml);
  });

  // Legacy Apple URL
  fastify.get('/library/test/success.html', async (_request, reply) => {
    reply.type('text/html').send(portalHtml);
  });

  // ── Windows ───────────────────────────────────────────────────
  // Windows checks connectivity by hitting these URLs and expecting specific text.
  // Returning unexpected content triggers the system browser to open.
  fastify.get('/connecttest.txt', async (_request, reply) => {
    reply.type('text/plain').send('Microsoft Connect Test');
  });

  fastify.get('/ncsi.txt', async (_request, reply) => {
    reply.type('text/plain').send('Microsoft NCSI');
  });

  // ── Firefox ───────────────────────────────────────────────────
  fastify.get('/canonical.html', async (_request, reply) => {
    reply.status(302).redirect('/');
  });

  // ── Portal Root ───────────────────────────────────────────────
  // Serves the upload portal for all devices
  fastify.get('/', async (_request, reply) => {
    reply.type('text/html').send(portalHtml);
  });

  // ── Wildcard fallback ─────────────────────────────────────────
  // Any unmatched GET request gets redirected to the portal root.
  // This catches all captive portal probe URLs we may have missed.
  fastify.setNotFoundHandler(async (request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/api/')) {
      reply.type('text/html').send(portalHtml);
    } else {
      reply.status(404).send({ error: 'Not Found' });
    }
  });
}
