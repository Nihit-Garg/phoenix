/**
 * utils/network.ts — local LAN IP address utility
 *
 * Responsibilities:
 * - Return the machine's local LAN IPv4 address (e.g. 192.168.1.42)
 * - Called at server startup to print the full URL teammates should use
 *
 * Export:
 *
 *   getLanIp(): string
 *     Iterates over os.networkInterfaces() to find the first non-loopback
 *     IPv4 address. Returns '0.0.0.0' as a fallback if none found.
 *
 *   getServerUrl(port: number): string
 *     Returns the full server URL string, e.g. "http://192.168.1.42:3001"
 *     Used for the startup banner in server.ts.
 *
 * Implementation hint:
 *   import os from 'os';
 *   const interfaces = os.networkInterfaces();
 *   // filter for family === 'IPv4' and internal === false
 *
 * No external dependencies needed — Node.js built-in `os` module only.
 */
