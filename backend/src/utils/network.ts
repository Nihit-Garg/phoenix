import { NetworkInterface, networkInterfaces } from 'os';

/**
 * Returns the first non-loopback IPv4 address found on the machine.
 * Falls back to '0.0.0.0' if none is found.
 */
export function getLanIp(): string {
  const nets = networkInterfaces();

  for (const name of Object.keys(nets)) {
    const ifaces = nets[name];
    if (!ifaces) continue;

    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return '0.0.0.0';
}

/**
 * Returns the full server URL for display at startup.
 * e.g. "http://192.168.1.42:3001"
 */
export function getServerUrl(port: number): string {
  return `http://${getLanIp()}:${port}`;
}
