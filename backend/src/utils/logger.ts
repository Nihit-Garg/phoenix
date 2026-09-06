type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function log(level: LogLevel, context: string, message: string, meta?: object): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [${context}]`;
  if (meta) {
    console.log(`${prefix} ${message}`, JSON.stringify(meta));
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export const logger = {
  info:  (context: string, message: string, meta?: object) => log('INFO',  context, message, meta),
  warn:  (context: string, message: string, meta?: object) => log('WARN',  context, message, meta),
  error: (context: string, message: string, meta?: object) => log('ERROR', context, message, meta),
  debug: (context: string, message: string, meta?: object) => log('DEBUG', context, message, meta),
};
