// Minimal logger used internally by the module system. Warnings and errors go to
// stderr; info/debug/trace are suppressed unless SOMON_DEBUG is set.

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const DEBUG = () => process.env.SOMON_DEBUG === '1' || process.env.SOMON_DEBUG === 'true';

export class Logger {
  private readonly component: string;

  constructor(component: string) {
    this.component = component;
  }

  private prefix(): string {
    return `[${this.component}]`;
  }

  trace(_message: string, _meta?: unknown): void {
    // No-op at production use.
  }

  debug(message: string, meta?: unknown): void {
    if (DEBUG()) {
      console.error(this.prefix(), 'DEBUG', message, meta ?? '');
    }
  }

  info(message: string, meta?: unknown): void {
    if (DEBUG()) {
      console.error(this.prefix(), 'INFO', message, meta ?? '');
    }
  }

  warn(message: string, meta?: unknown): void {
    console.warn(this.prefix(), message, meta ?? '');
  }

  error(message: string, errorOrMeta?: unknown, extra?: unknown): void {
    console.error(this.prefix(), message, errorOrMeta ?? '', extra ?? '');
  }

  fatal(message: string, errorOrMeta?: unknown, extra?: unknown): void {
    console.error(this.prefix(), 'FATAL', message, errorOrMeta ?? '', extra ?? '');
  }
}

export const moduleSystemLogger = new Logger('module-system');
export const moduleLoaderLogger = new Logger('module-loader');
export const moduleRegistryLogger = new Logger('module-registry');
export const moduleResolverLogger = new Logger('module-resolver');
