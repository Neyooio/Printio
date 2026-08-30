import crypto from 'node:crypto';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createSession, getSession, touchSession } from '../database/queries';
import { SESSION_COOKIE_NAME } from '../constants';

/**
 * Registers a Fastify hook that ensures every request has a valid session.
 * API routes require a session; portal routes auto-create one.
 */
export function registerSessionMiddleware(fastify: FastifyInstance): void {
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip session handling for non-API portal asset routes
    const url = request.url;
    if (url === '/api/health') return;

    // Try to extract existing session
    let sessionId = extractSessionFromRequest(request);

    if (sessionId) {
      const session = getSession(sessionId);
      if (session) {
        // Valid existing session — touch it
        touchSession(sessionId);
        (request as any).sessionId = sessionId;
        return;
      }
    }

    // No valid session — create one for portal visitors
    if (!url.startsWith('/api/') || url === '/api/session') {
      sessionId = generateSessionId();
      const clientIp = request.ip || request.headers['x-forwarded-for'] as string || 'unknown';
      const userAgent = request.headers['user-agent'] || '';
      createSession(sessionId, clientIp, userAgent);
      (request as any).sessionId = sessionId;

      // Set cookie for browser persistence
      reply.header('Set-Cookie', `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Strict`);
      return;
    }

    // API routes require a valid session
    if (url.startsWith('/api/')) {
      // upload-chunk and upload-status use X-Customer-Session header
      const headerSession = request.headers['x-customer-session'] as string;
      if (headerSession) {
        const session = getSession(headerSession);
        if (session) {
          touchSession(headerSession);
          (request as any).sessionId = headerSession;
          return;
        }
      }

      reply.status(401).send({ error: 'Valid session required' });
    }
  });
}

/**
 * Session creation endpoint — the portal client calls this on load.
 */
export function registerSessionRoute(fastify: FastifyInstance): void {
  fastify.get('/api/session', async (request, reply) => {
    let sessionId = (request as any).sessionId as string;

    if (!sessionId) {
      sessionId = generateSessionId();
      const clientIp = request.ip || 'unknown';
      const userAgent = request.headers['user-agent'] || '';
      createSession(sessionId, clientIp, userAgent);
      reply.header('Set-Cookie', `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Strict`);
    }

    return { sessionId };
  });
}

function generateSessionId(): string {
  return crypto.randomUUID();
}

function extractSessionFromRequest(request: FastifyRequest): string | null {
  // Check X-Customer-Session header
  const headerSession = request.headers['x-customer-session'];
  if (typeof headerSession === 'string' && headerSession) {
    return headerSession;
  }

  // Check cookie
  const cookieHeader = request.headers['cookie'];
  if (typeof cookieHeader === 'string') {
    const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    if (match) return match[1];
  }

  return null;
}
