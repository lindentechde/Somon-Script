/**
 * Structured logging with JSON support and correlation IDs
 */
import { randomBytes } from 'node:crypto';

export interface LogContext {
  correlationId?: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  correlationId?: string;
  component?: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number;
  [key: string]: unknown;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface StructuredLoggerOptions {
  format?: 'json' | 'text';
  level?: LogLevel;
  component?: string;
  defaultContext?: LogContext;
  output?: (_entry: LogEntry) => void;
}

/**
 * Generate a unique correlation ID
 */
export function generateCorrelationId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Structured logger with JSON support
 */
export class StructuredLogger {
  private readonly format: 'json' | 'text';
  private readonly level: LogLevel;
  private readonly component?: string;
  private readonly defaultContext: LogContext;
  private readonly output: (_entry: LogEntry) => void;
  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  };

  constructor(options: StructuredLoggerOptions = {}) {
    this.format = options.format || 'text';
    this.level = options.level || 'info';
    this.component = options.component;
    this.defaultContext = options.defaultContext || {};
    this.output =
      options.output ||
      (entry => {
        if (this.format === 'json') {
          console.log(JSON.stringify(entry));
        } else {
          this.outputText(entry);
        }
      });
  }

  private outputText(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const component = entry.component ? ` [${entry.component}]` : '';
    const correlationId = entry.correlationId ? ` [${entry.correlationId}]` : '';
    let message = `${prefix}${component}${correlationId} ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = Object.entries(entry.context)
        .filter(([key]) => key !== 'correlationId')
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(' ');
      if (contextStr) {
        message += ` ${contextStr}`;
      }
    }

    if (entry.error) {
      message += ` error=${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        message += `\n${entry.error.stack}`;
      }
    }

    if (entry.duration !== undefined) {
      message += ` duration=${entry.duration}ms`;
    }

    console.log(message);
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.level];
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
    duration?: number
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      component: this.component,
    };

    // Merge contexts
    const fullContext = { ...this.defaultContext, ...context };
    if (Object.keys(fullContext).length > 0) {
      entry.context = fullContext;
      if (fullContext.correlationId) {
        entry.correlationId = fullContext.correlationId;
      }
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (duration !== undefined) {
      entry.duration = duration;
    }

    return entry;
  }

  debug(message: string, context?: LogContext, duration?: number): void {
    if (this.shouldLog('debug')) {
      this.output(this.createEntry('debug', message, context, undefined, duration));
    }
  }

  info(message: string, context?: LogContext, duration?: number): void {
    if (this.shouldLog('info')) {
      this.output(this.createEntry('info', message, context, undefined, duration));
    }
  }

  warn(message: string, context?: LogContext, error?: Error, duration?: number): void {
    if (this.shouldLog('warn')) {
      this.output(this.createEntry('warn', message, context, error, duration));
    }
  }

  error(message: string, error?: Error, context?: LogContext, duration?: number): void {
    if (this.shouldLog('error')) {
      this.output(this.createEntry('error', message, context, error, duration));
    }
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog('fatal')) {
      this.output(this.createEntry('fatal', message, context, error));
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): StructuredLogger {
    return new StructuredLogger({
      format: this.format,
      level: this.level,
      component: this.component,
      defaultContext: { ...this.defaultContext, ...context },
      output: this.output,
    });
  }

  /**
   * Create a timer for measuring operation duration
   */
  startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }
}

/**
 * Global logger factory with structured logging support
 */
export class StructuredLoggerFactory {
  private static readonly loggers = new Map<string, StructuredLogger>();
  private static globalOptions: StructuredLoggerOptions = {
    format: process.env.LOG_FORMAT === 'json' ? 'json' : 'text',
    level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  };

  /**
   * Configure global logging options
   */
  static configure(options: StructuredLoggerOptions): void {
    this.globalOptions = { ...this.globalOptions, ...options };
    // Update existing loggers
    for (const [component] of this.loggers) {
      this.loggers.set(
        component,
        new StructuredLogger({
          ...this.globalOptions,
          component,
        })
      );
    }
  }

  /**
   * Get or create a logger for a component
   */
  static getLogger(component?: string): StructuredLogger {
    const key = component || 'default';
    if (!this.loggers.has(key)) {
      this.loggers.set(
        key,
        new StructuredLogger({
          ...this.globalOptions,
          component,
        })
      );
    }
    return this.loggers.get(key)!;
  }

  /**
   * Create a logger with correlation ID
   */
  static getLoggerWithCorrelation(component?: string, correlationId?: string): StructuredLogger {
    const id = correlationId || generateCorrelationId();
    return this.getLogger(component).child({ correlationId: id });
  }
}
