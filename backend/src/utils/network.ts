import os from 'os';


/**
 * getLanIp — returns the first non-loopback IPv4 address.
 *
 * Iterates over os.networkInterfaces() and finds the first interface
 * whose family is 'IPv4' and internal is false.
 *
 * @returns The LAN IPv4 address string, or '0.0.0.0' if none is found.
 */
export function getLanIp(): string {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    const addrs = interfaces[name];
    if (!addrs) continue;

    for (const addr of addrs) {
      // Accept IPv4 non-loopback addresses only
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }

  return '0.0.0.0';
}

/**
 * getServerUrl — returns the full server URL for the startup banner.
 *
 * @param port - The port the server is listening on.
 * @returns A full URL string like "http://192.168.1.42:3001"
 */
export function getServerUrl(port: number): string {
  return `http://${getLanIp()}:${port}`;
}
