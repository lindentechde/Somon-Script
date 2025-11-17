/**
 * Production-grade structured logging system
 * Provides performance tracing and operational visibility
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  component: string;
  operation?: string;
  moduleId?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, unknown>;
  traceId?: string;
  spanId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  format: 'json' | 'pretty';
  enableTracing: boolean;
  enableColors: boolean;
  timestamp: boolean;
  includeStack: boolean;
}

/**
 * Performance tracer for tracking operation latency
 */
export class PerformanceTrace {
  private readonly startTime: number;
  private readonly operation: string;
  private readonly metadata: Record<string, unknown>;
  private completed = false;

  constructor(operation: string, metadata: Record<string, unknown> = {}) {
    this.operation = operation;
    this.metadata = metadata;
    this.startTime = Date.now();
  }

  /**
   * Complete the trace and log the duration
   */
  complete(logger: Logger, result?: 'success' | 'error', error?: Error): number {
    if (this.completed) {
      return 0;
    }

    const duration = Date.now() - this.startTime;
    this.completed = true;

    const logData: Record<string, unknown> = {
      operation: this.operation,
      duration,
      result: result || 'success',
      ...this.metadata,
    };

    if (error) {
      logData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
      logger.warn(`Operation failed: ${this.operation}`, logData);
    } else {
      logger.debug(`Operation completed: ${this.operation}`, logData);
    }

    return duration;
  }

  /**
   * Get current duration without completing the trace
   */
  getCurrentDuration(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Production logger with structured output and tracing
 */
export class Logger {
  private readonly config: Required<LoggerConfig>;
  private readonly component: string;
  private static readonly LOG_LEVELS: Record<LogLevel, number> = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    fatal: 5,
  };

  private static readonly COLORS: Record<LogLevel, string> = {
    trace: '\x1b[90m', // gray
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m', // green
    warn: '\x1b[33m', // yellow
    error: '\x1b[31m', // red
    fatal: '\x1b[35m', // magenta
  };

  private static readonly RESET_COLOR = '\x1b[0m';

  constructor(component: string, config: Partial<LoggerConfig> = {}) {
    this.component = component;
    this.config = {
      level: config.level || 'info',
      format: config.format || 'json',
      enableTracing: config.enableTracing ?? true,
      enableColors: config.enableColors ?? true,
      timestamp: config.timestamp ?? true,
      includeStack: config.includeStack ?? false,
    };
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalComponent: string, metadata: Record<string, unknown> = {}): Logger {
    const childLogger = new Logger(`${this.component}.${additionalComponent}`, this.config);
    // Store metadata for all child logger calls
    (childLogger as Logger & { defaultMetadata?: Record<string, unknown> }).defaultMetadata =
      metadata;
    return childLogger;
  }

  /**
   * Start a performance trace
   */
  startTrace(operation: string, metadata: Record<string, unknown> = {}): PerformanceTrace {
    if (!this.config.enableTracing) {
      return new PerformanceTrace(operation, metadata);
    }

    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();

    this.debug(`Starting operation: ${operation}`, {
      operation,
      traceId,
      spanId,
      ...metadata,
    });

    const trace = new PerformanceTrace(operation, { traceId, spanId, ...metadata });
    return trace;
  }

  /**
   * Measure and log the execution of an async operation
   */
  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata: Record<string, unknown> = {}
  ): Promise<T> {
    const trace = this.startTrace(operation, metadata);

    try {
      const result = await fn();
      trace.complete(this, 'success');
      return result;
    } catch (error) {
      trace.complete(this, 'error', error as Error);
      throw error;
    }
  }

  /**
   * Measure and log the execution of a sync operation
   */
  measureSync<T>(operation: string, fn: () => T, metadata: Record<string, unknown> = {}): T {
    const trace = this.startTrace(operation, metadata);

    try {
      const result = fn();
      trace.complete(this, 'success');
      return result;
    } catch (error) {
      trace.complete(this, 'error', error as Error);
      throw error;
    }
  }

  trace(message: string, metadata?: Record<string, unknown>): void {
    this.log('trace', message, metadata);
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', message, metadata);
  }

  error(
    message: string,
    error?: Error | Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): void {
    let errorData: Record<string, unknown> = {};
    let metaData = metadata || {};

    if (error instanceof Error) {
      errorData = {
        error: {
          name: error.name,
          message: error.message,
          stack: this.config.includeStack ? error.stack : undefined,
          code: (error as Error & { code?: string }).code,
        },
      };
    } else if (error && typeof error === 'object') {
      metaData = { ...error, ...metaData };
    }

    this.log('error', message, { ...errorData, ...metaData });
  }

  fatal(
    message: string,
    error?: Error | Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): void {
    let errorData: Record<string, unknown> = {};
    let metaData = metadata || {};

    if (error instanceof Error) {
      errorData = {
        error: {
          name: error.name,
          message: error.message,
          stack: this.config.includeStack ? error.stack : undefined,
          code: (error as Error & { code?: string }).code,
        },
      };
    } else if (error && typeof error === 'object') {
      metaData = { ...error, ...metaData };
    }

    this.log('fatal', message, { ...errorData, ...metaData });
    // In production, this might trigger alerts or shutdown procedures
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: this.config.timestamp ? new Date().toISOString() : '',
      level,
      message,
      component: this.component,
      ...((this as Logger & { defaultMetadata?: Record<string, unknown> }).defaultMetadata || {}),
      ...metadata,
    };

    const output = this.formatLogEntry(entry);

    // Write to appropriate stream
    const stream = level === 'error' || level === 'fatal' ? process.stderr : process.stdout;
    stream.write(output + '\n');
  }

  private shouldLog(level: LogLevel): boolean {
    return Logger.LOG_LEVELS[level] >= Logger.LOG_LEVELS[this.config.level];
  }

  private formatLogEntry(entry: LogEntry): string {
    if (this.config.format === 'json') {
      return JSON.stringify(entry);
    }

    // Pretty format for development
    const color = this.config.enableColors ? Logger.COLORS[entry.level] : '';
    const reset = this.config.enableColors ? Logger.RESET_COLOR : '';
    const timestamp = entry.timestamp ? `[${entry.timestamp}] ` : '';
    const level = entry.level.toUpperCase().padEnd(5);
    const component = entry.component ? `[${entry.component}] ` : '';

    let message = `${color}${timestamp}${level}${reset} ${component}${entry.message}`;

    // Add operation and duration if available
    if (entry.operation) {
      message += ` (${entry.operation}`;
      if (entry.duration !== undefined) {
        message += ` - ${entry.duration}ms`;
      }
      message += ')';
    }

    // Add metadata if present
    const metadataEntries = Object.entries(entry).filter(
      ([key]) =>
        !['timestamp', 'level', 'message', 'component', 'operation', 'duration'].includes(key)
    );

    if (metadataEntries.length > 0) {
      const metadata = Object.fromEntries(metadataEntries);
      message += ` ${JSON.stringify(metadata)}`;
    }

    return message;
  }

  private generateTraceId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  private generateSpanId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * Update logger configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

/**
 * Global logger factory and manager
 */
export class LoggerFactory {
  private static readonly loggers = new Map<string, Logger>();
  private static readonly globalConfig: Partial<LoggerConfig> = {
    level: (process.env.LOG_LEVEL as LogLevel) || 'warn',
    format: process.env.LOG_FORMAT === 'json' ? 'json' : 'pretty',
    enableTracing: true,
    enableColors: false,
    timestamp: true,
    includeStack: false,
  };

  /**
   * Get or create a logger for a component
   */
  static getLogger(component: string): Logger {
    if (!this.loggers.has(component)) {
      this.loggers.set(component, new Logger(component, this.globalConfig));
    }
    return this.loggers.get(component)!;
  }

  /**
   * Update global configuration for all loggers
   */
  static updateGlobalConfig(config: Partial<LoggerConfig>): void {
    Object.assign(this.globalConfig, config);

    // Update existing loggers
    for (const logger of this.loggers.values()) {
      logger.updateConfig(config);
    }
  }

  /**
   * Set log level for all loggers
   */
  static setLevel(level: LogLevel): void {
    this.updateGlobalConfig({ level });
  }

  /**
   * Enable or disable tracing for all loggers
   */
  static setTracing(enabled: boolean): void {
    this.updateGlobalConfig({ enableTracing: enabled });
  }

  /**
   * Set output format for all loggers
   */
  static setFormat(format: 'json' | 'pretty'): void {
    this.updateGlobalConfig({ format });
  }

  /**
   * Get all registered loggers
   */
  static getAllLoggers(): Map<string, Logger> {
    return new Map(this.loggers);
  }

  /**
   * Clear all loggers
   */
  static clearAll(): void {
    this.loggers.clear();
  }
}

// Export default logger for module system
export const moduleSystemLogger = LoggerFactory.getLogger('module-system');
export const moduleLoaderLogger = LoggerFactory.getLogger('module-loader');
export const moduleRegistryLogger = LoggerFactory.getLogger('module-registry');
export const moduleResolverLogger = LoggerFactory.getLogger('module-resolver');
