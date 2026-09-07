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
  const configured = process.env.LAN_IP?.trim();
  if (configured) return configured;

  const interfaces = os.networkInterfaces();

  const candidates: Array<{ name: string; address: string }> = [];

  for (const name of Object.keys(interfaces)) {
    const addrs = interfaces[name];
    if (!addrs) continue;

    for (const addr of addrs) {
      // Accept IPv4 non-loopback addresses only
      if (addr.family === 'IPv4' && !addr.internal) {
        candidates.push({ name, address: addr.address });
      }
    }
  }

  // Prefer physical Wi-Fi/Ethernet adapters over common virtual adapters.
  const physical = candidates.find(({ name }) =>
    !/(docker|hyper-v|vEthernet|virtual|vmware|vpn|wsl)/i.test(name)
  );
  if (physical) return physical.address;
  if (candidates[0]) return candidates[0].address;

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
