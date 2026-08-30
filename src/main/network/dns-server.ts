import dgram from 'node:dgram';
import * as dnsPacket from 'dns-packet';
import { DNS_PORT, DNS_BIND_ADDRESS } from '../constants';

let server: dgram.Socket | null = null;
let resolveIp = '192.168.137.1';

/**
 * Starts the DNS interceptor on UDP port 53.
 * All incoming A-record queries are resolved to the provided gateway IP.
 */
export function startDnsServer(gatewayIp: string): Promise<void> {
  resolveIp = gatewayIp;

  return new Promise((resolve, reject) => {
    server = dgram.createSocket('udp4');

    server.on('message', (msg, rinfo) => {
      try {
        const query = dnsPacket.decode(msg);
        if (!query.questions || query.questions.length === 0) return;

        const question = query.questions[0];

        // Build a response that resolves everything to our gateway
        const response = dnsPacket.encode({
          type: 'response',
          id: query.id,
          flags: dnsPacket.RECURSION_DESIRED | dnsPacket.AUTHORITATIVE_ANSWER,
          questions: query.questions,
          answers: [
            {
              type: 'A',
              class: 'IN',
              name: question.name,
              ttl: 60,
              data: resolveIp,
            },
          ],
        });

        server!.send(response, 0, response.length, rinfo.port, rinfo.address);
      } catch (err) {
        console.error('[DNS] Error processing query:', err);
      }
    });

    server.on('error', (err) => {
      console.error(`[DNS] Server error:`, err);
      reject(err);
    });

    server.bind(DNS_PORT, DNS_BIND_ADDRESS, () => {
      console.log(`[DNS] Interceptor listening on ${DNS_BIND_ADDRESS}:${DNS_PORT} → ${resolveIp}`);
      resolve();
    });
  });
}

/**
 * Stops the DNS server gracefully.
 */
export function stopDnsServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('[DNS] Server stopped');
        server = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

/**
 * Returns whether the DNS server is currently running.
 */
export function isDnsRunning(): boolean {
  return server !== null;
}
