/**
 * utils/network.ts — local LAN IP address utility
 *
 * Iterates os.networkInterfaces() to find the first non-loopback IPv4 address.
 * Used at server startup to print the full URL teammates should use.
 */

import os from 'os';

/**
 * getLanIp — returns the machine's local LAN IPv4 address.
 * Returns '0.0.0.0' as a fallback if none is found.
 */
export function getLanIp(): string {
  const interfaces = os.networkInterfaces();

  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }

  return '0.0.0.0';
}

/**
 * getServerUrl — returns the full server URL string.
 * Example: "http://192.168.1.42:3001"
 * Used for the startup banner in server.ts.
 */
export function getServerUrl(port: number): string {
  const ip = getLanIp();
  return `http://${ip}:${port}`;
}
