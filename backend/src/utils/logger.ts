/**
 * utils/logger.ts — console logger with timestamps
 *
 * Responsibilities:
 * - Provide a simple logger with levels: info, warn, error, debug
 * - Prefix every log line with an ISO timestamp and level tag
 * - Example output: [2024-01-15T10:23:45.123Z] [INFO] [onJoin] Node node-a3f2 joined
 *
 * Export the following functions:
 *
 *   logger.info(context: string, message: string, meta?: object): void
 *   logger.warn(context: string, message: string, meta?: object): void
 *   logger.error(context: string, message: string, meta?: object): void
 *   logger.debug(context: string, message: string, meta?: object): void
 *
 * 'context' is the calling module name (e.g., 'onJoin', 'registry', 'server')
 * 'meta' is an optional object logged as JSON after the message
 *
 * For MVP: plain console.log is acceptable; just wrap it with the timestamp format.
 * Do NOT add external logging libraries (pino, winston) — keep it simple.
 */
