/**
 * utils/logger.ts — console logger with timestamps
 *
 * Provides a simple structured logger with levels: info, warn, error, debug.
 * Every line is prefixed with an ISO timestamp and level tag.
 *
 * Example output:
 *   [2024-01-15T10:23:45.123Z] [INFO]  [onJoin] Node node-a3f2 joined
 *   [2024-01-15T10:23:45.456Z] [ERROR] [registry] Failed to parse entry {"err":"..."}
 *
 * No external dependencies — plain console only.
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
  const levelPadded = level.padEnd(5);
  const line = `[${timestamp}] [${levelPadded}] [${context}] ${message}${formatMeta(meta)}`;

  if (level === 'ERROR') {
    console.error(line);
  } else if (level === 'WARN') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  /**
   * Log an informational message.
   * @param context - The calling module name (e.g., 'onJoin', 'registry', 'server')
   * @param message - Human-readable message
   * @param meta - Optional object logged as JSON after the message
   */
  info(context: string, message: string, meta?: object): void {
    log('INFO', context, message, meta);
  },

  /**
   * Log a warning message.
   */
  warn(context: string, message: string, meta?: object): void {
    log('WARN', context, message, meta);
  },

  /**
   * Log an error message.
   */
  error(context: string, message: string, meta?: object): void {
    log('ERROR', context, message, meta);
  },

  /**
   * Log a debug message. Only shown in development.
   */
  debug(context: string, message: string, meta?: object): void {
    if (process.env.NODE_ENV !== 'production') {
      log('DEBUG', context, message, meta);
    }
  },
};
