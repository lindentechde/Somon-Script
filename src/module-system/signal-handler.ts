/**
 * Production-grade signal handling for graceful shutdown
 * Handles SIGTERM, SIGINT, and SIGHUP for proper cleanup
 */

export type ShutdownHandler = () => Promise<void> | void;

export interface SignalHandlerOptions {
  /** Timeout in milliseconds before forcing shutdown (default: 30000) */
  shutdownTimeout?: number;
  /** Custom logger for shutdown events */
  logger?: {
    info: (_message: string, _meta?: Record<string, unknown>) => void;
    warn: (_message: string, _meta?: Record<string, unknown>) => void;
    error: (_message: string, _meta?: Record<string, unknown>) => void;
  };
}

/**
 * Graceful shutdown manager for production systems
 */
export class SignalHandler {
  private handlers: ShutdownHandler[] = [];
  private isShuttingDown = false;
  private readonly shutdownTimeout: number;
  private readonly logger?: SignalHandlerOptions['logger'];

  constructor(options: SignalHandlerOptions = {}) {
    this.shutdownTimeout = options.shutdownTimeout ?? 30000;
    this.logger = options.logger;

    // Bind shutdown to preserve context
    this.handleSignal = this.handleSignal.bind(this);
  }

  /**
   * Register a shutdown handler to be called during graceful shutdown
   */
  register(handler: ShutdownHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Install signal handlers for SIGTERM, SIGINT, and SIGHUP
   */
  install(): void {
    process.on('SIGTERM', this.handleSignal);
    process.on('SIGINT', this.handleSignal);
    process.on('SIGHUP', this.handleSignal);

    if (this.logger) {
      this.logger.info('Signal handlers installed', {
        signals: ['SIGTERM', 'SIGINT', 'SIGHUP'],
        timeout: this.shutdownTimeout,
      });
    }
  }

  /**
   * Remove signal handlers
   */
  uninstall(): void {
    process.off('SIGTERM', this.handleSignal);
    process.off('SIGINT', this.handleSignal);
    process.off('SIGHUP', this.handleSignal);

    if (this.logger) {
      this.logger.info('Signal handlers uninstalled');
    }
  }

  /**
   * Handle shutdown signals gracefully
   */
  private async handleSignal(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      if (this.logger) {
        this.logger.warn('Shutdown already in progress, ignoring signal', { signal });
      }
      return;
    }

    this.isShuttingDown = true;

    if (this.logger) {
      this.logger.info('Received shutdown signal, starting graceful shutdown', {
        signal,
        handlerCount: this.handlers.length,
      });
    } else {
      console.log(`\nReceived ${signal}, shutting down gracefully...`);
    }

    const shutdownPromise = this.executeShutdown();

    // Enforce shutdown timeout
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<void>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Graceful shutdown timeout after ${this.shutdownTimeout}ms`));
      }, this.shutdownTimeout);
    });

    try {
      await Promise.race([shutdownPromise, timeoutPromise]);

      if (this.logger) {
        this.logger.info('Graceful shutdown complete');
      } else {
        console.log('Shutdown complete');
      }

      process.exit(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (this.logger) {
        this.logger.error('Shutdown failed or timed out, forcing exit', { error: message });
      } else {
        console.error('Shutdown failed or timed out:', message);
      }

      process.exit(1);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Execute all registered shutdown handlers
   */
  private async executeShutdown(): Promise<void> {
    const results = await Promise.allSettled(
      this.handlers.map(async (handler, index) => {
        try {
          await handler();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (this.logger) {
            this.logger.error(`Shutdown handler ${index} failed`, { error: message });
          } else {
            console.error(`Shutdown handler ${index} failed:`, message);
          }
          throw error;
        }
      })
    );

    // Check if any handlers failed
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length > 0) {
      throw new Error(`${failed.length} shutdown handler(s) failed`);
    }
  }

  /**
   * Trigger graceful shutdown manually
   */
  async shutdown(): Promise<void> {
    await this.handleSignal('MANUAL');
  }
}
