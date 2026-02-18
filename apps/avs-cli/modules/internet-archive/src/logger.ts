export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Simple Logger for the vulnerability scanner
 */
class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (this.level === 'debug') {
      console.log(`[DEBUG] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    if (['debug', 'info'].includes(this.level)) {
      console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }

  warn(message: string, meta?: Record<string, any>): void {
    if (['debug', 'info', 'warn'].includes(this.level)) {
      console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }

  error(message: string, error?: Error | Record<string, any>): void {
    if (error instanceof Error) {
      console.error(`[ERROR] ${message}:`, error.message);
    } else {
      console.error(`[ERROR] ${message}`, error ? JSON.stringify(error) : '');
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

export default new Logger();
