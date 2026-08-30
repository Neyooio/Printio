import os from 'node:os';
import { ICS_SUBNET_PREFIX, DEFAULT_GATEWAY_IP } from '../constants';

/**
 * Auto-detects the local gateway IP by scanning network interfaces.
 * Looks for the Windows ICS subnet (192.168.137.x) first, then
 * falls back to any non-loopback, non-link-local IPv4 address.
 */
export function detectGatewayIp(): string {
  const interfaces = os.networkInterfaces();
  let fallbackIp: string | null = null;

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family !== 'IPv4' || addr.internal) continue;

      // Prefer the ICS hotspot subnet
      if (addr.address.startsWith(ICS_SUBNET_PREFIX)) {
        console.log(`[Network] Detected ICS hotspot on ${name}: ${addr.address}`);
        return addr.address;
      }

      // Track a fallback (any non-loopback, non-APIPA address)
      if (!addr.address.startsWith('169.254') && !fallbackIp) {
        fallbackIp = addr.address;
      }
    }
  }

  if (fallbackIp) {
    console.log(`[Network] No ICS subnet found, using fallback: ${fallbackIp}`);
    return fallbackIp;
  }

  console.warn(`[Network] No suitable adapter found, using default: ${DEFAULT_GATEWAY_IP}`);
  return DEFAULT_GATEWAY_IP;
}

/**
 * Returns all network interface addresses for display in settings.
 */
export function getNetworkInfo(): Array<{ name: string; address: string; mac: string }> {
  const interfaces = os.networkInterfaces();
  const results: Array<{ name: string; address: string; mac: string }> = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      results.push({ name, address: addr.address, mac: addr.mac });
    }
  }

  return results;
}
