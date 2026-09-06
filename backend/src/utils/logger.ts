/**
 * utils/logger.ts — console logger with timestamps
 *
 * Provides a simple logger with levels: info, warn, error, debug
 * Prefix every log line with an ISO timestamp and level tag
 * Example output: [2024-01-15T10:23:45.123Z] [INFO] [onJoin] Node node-a3f2 joined
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function formatMeta(meta?: object): string {
  if (!meta) return '';
  try {
    return ' ' + JSON.stringify(meta);
  } catch {
    return ' [unserializable meta]';
  }
}

function log(level: LogLevel, context: string, message: string, meta?: object): void {
  const timestamp = new Date().toISOString();
  const metaStr = formatMeta(meta);
  console.log(`[${timestamp}] [${level}] [${context}] ${message}${metaStr}`);
}

export const logger = {
  info(context: string, message: string, meta?: object): void {
    log('INFO', context, message, meta);
  },
  warn(context: string, message: string, meta?: object): void {
    log('WARN', context, message, meta);
  },
  error(context: string, message: string, meta?: object): void {
    log('ERROR', context, message, meta);
  },
  debug(context: string, message: string, meta?: object): void {
    if (process.env.NODE_ENV !== 'production') {
      log('DEBUG', context, message, meta);
    }
  },
};
