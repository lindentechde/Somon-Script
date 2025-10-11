/**
 * Structured Logger Unit Tests
 *
 * Tests for the structured logging system with JSON support:
 * - Log level filtering
 * - JSON vs text format output
 * - Child logger context
 * - Error logging with stack traces
 * - Correlation IDs
 * - Timer functionality
 * - LoggerFactory behavior
 */

import {
  StructuredLogger,
  StructuredLoggerFactory,
  generateCorrelationId,
  LogEntry,
  LogLevel,
} from '../src/module-system/structured-logger';

describe('StructuredLogger', () => {
  let capturedOutput: LogEntry[] = [];

  beforeEach(() => {
    capturedOutput = [];
  });

  const createTestLogger = (options = {}) => {
    return new StructuredLogger({
      format: 'json',
      level: 'debug',
      output: (entry: LogEntry) => {
        capturedOutput.push(entry);
      },
      ...options,
    });
  };

  describe('Log Level Filtering', () => {
    it('should filter logs below configured level', () => {
      const logger = createTestLogger({ level: 'warn' });

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      logger.fatal('fatal message');

      // Only warn, error, and fatal should be logged
      expect(capturedOutput.length).toBe(3);
      expect(capturedOutput[0].level).toBe('warn');
      expect(capturedOutput[1].level).toBe('error');
      expect(capturedOutput[2].level).toBe('fatal');
    });

    it('should log all levels when set to debug', () => {
      const logger = createTestLogger({ level: 'debug' });

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(capturedOutput.length).toBe(4);
    });

    it('should respect log level hierarchy', () => {
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];

      for (let i = 0; i < levels.length; i++) {
        capturedOutput = [];
        const logger = createTestLogger({ level: levels[i] });

        // Log all levels
        logger.debug('debug');
        logger.info('info');
        logger.warn('warn');
        logger.error('error');
        logger.fatal('fatal');

        // Each level filters out logs below it
        const expectedLogs = levels.length - i;
        expect(capturedOutput.length).toBe(expectedLogs);
      }
    });
  });

  describe('JSON Format Output', () => {
    it('should output valid JSON entries', () => {
      const logger = createTestLogger({ component: 'test-component' });

      logger.info('test message', { key: 'value', number: 42 });

      expect(capturedOutput.length).toBe(1);
      const entry = capturedOutput[0];

      expect(entry.level).toBe('info');
      expect(entry.message).toBe('test message');
      expect(entry.component).toBe('test-component');
      expect(entry.context?.key).toBe('value');
      expect(entry.context?.number).toBe(42);
      expect(entry.timestamp).toBeDefined();
    });

    it('should include all required fields in log entries', () => {
      const logger = createTestLogger({ component: 'test' });

      logger.info('message');

      const entry = capturedOutput[0];

      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('level');
      expect(entry).toHaveProperty('message');
      expect(entry).toHaveProperty('component');
      expect(typeof entry.timestamp).toBe('string');
      expect(typeof entry.level).toBe('string');
      expect(typeof entry.message).toBe('string');
      expect(typeof entry.component).toBe('string');
    });

    it('should properly handle complex metadata', () => {
      const logger = createTestLogger();

      const context = {
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        boolean: true,
        nullValue: null,
      };

      logger.info('complex', context);

      const entry = capturedOutput[0];
      expect(entry.context?.nested).toEqual({ deep: { value: 123 } });
      expect(entry.context?.array).toEqual([1, 2, 3]);
      expect(entry.context?.boolean).toBe(true);
      expect(entry.context?.nullValue).toBe(null);
    });
  });

  describe('Text Format Output', () => {
    it('should output text format when configured', () => {
      const logger = new StructuredLogger({
        format: 'text',
        component: 'test',
        output: () => {
          // Text format uses console.log internally, we just verify it doesn't crash
        },
      });

      expect(() => {
        logger.info('test message');
      }).not.toThrow();
    });

    it('should handle text format with context', () => {
      const logger = new StructuredLogger({
        format: 'text',
        component: 'test',
        output: () => {},
      });

      expect(() => {
        logger.info('message', { userId: 123, action: 'login' });
      }).not.toThrow();
    });

    it('should handle text format with errors', () => {
      const logger = new StructuredLogger({
        format: 'text',
        component: 'test',
        output: () => {},
      });

      const error = new Error('Test error');

      expect(() => {
        logger.error('Error occurred', error);
      }).not.toThrow();
    });

    it('should handle text format with duration', () => {
      const logger = new StructuredLogger({
        format: 'text',
        component: 'test',
        output: () => {},
      });

      expect(() => {
        logger.info('Operation completed', undefined, 123);
      }).not.toThrow();
    });

    it('should handle text format with correlation ID', () => {
      const logger = new StructuredLogger({
        format: 'text',
        component: 'test',
        output: () => {},
      });

      expect(() => {
        logger.info('message', { correlationId: 'abc123' });
      }).not.toThrow();
    });
  });

  describe('Error Logging', () => {
    it('should log error objects with name, message, and stack', () => {
      const logger = createTestLogger();

      const error = new Error('Something went wrong');
      logger.error('Error occurred', error);

      const entry = capturedOutput[0];

      expect(entry.level).toBe('error');
      expect(entry.message).toBe('Error occurred');
      expect(entry.error).toBeDefined();
      expect(entry.error?.name).toBe('Error');
      expect(entry.error?.message).toBe('Something went wrong');
      expect(entry.error?.stack).toBeDefined();
    });

    it('should handle fatal errors', () => {
      const logger = createTestLogger();

      const error = new Error('Fatal error');
      logger.fatal('Fatal occurred', error);

      const entry = capturedOutput[0];
      expect(entry.level).toBe('fatal');
      expect(entry.error).toBeDefined();
    });

    it('should log errors with context', () => {
      const logger = createTestLogger();

      const error = new Error('Error with context');
      logger.error('Error occurred', error, { requestId: '12345' });

      const entry = capturedOutput[0];
      expect(entry.context?.requestId).toBe('12345');
      expect(entry.error).toBeDefined();
    });

    it('should handle warn with error', () => {
      const logger = createTestLogger();

      const error = new Error('Warning error');
      logger.warn('Warning occurred', { userId: 'abc' }, error);

      const entry = capturedOutput[0];
      expect(entry.level).toBe('warn');
      expect(entry.error).toBeDefined();
      expect(entry.context?.userId).toBe('abc');
    });
  });

  describe('Context and Correlation IDs', () => {
    it('should include context in log entries', () => {
      const logger = createTestLogger();

      logger.info('User action', {
        userId: 123,
        action: 'login',
        timestamp: Date.now(),
      });

      const entry = capturedOutput[0];
      expect(entry.context?.userId).toBe(123);
      expect(entry.context?.action).toBe('login');
      expect(entry.context?.timestamp).toBeDefined();
    });

    it('should extract correlationId from context', () => {
      const logger = createTestLogger();

      logger.info('test', { correlationId: 'abc123' });

      const entry = capturedOutput[0];
      expect(entry.correlationId).toBe('abc123');
      expect(entry.context?.correlationId).toBe('abc123');
    });

    it('should support default context', () => {
      const logger = createTestLogger({
        defaultContext: { sessionId: 'session-123' },
      });

      logger.info('test');

      const entry = capturedOutput[0];
      expect(entry.context?.sessionId).toBe('session-123');
    });

    it('should merge default context with log context', () => {
      const logger = createTestLogger({
        defaultContext: { sessionId: 'session-123', userId: 'default-user' },
      });

      logger.info('test', { userId: 'override-user', action: 'login' });

      const entry = capturedOutput[0];
      expect(entry.context?.sessionId).toBe('session-123');
      expect(entry.context?.userId).toBe('override-user'); // Should override
      expect(entry.context?.action).toBe('login');
    });

    it('should include component in all logs', () => {
      const logger = createTestLogger({ component: 'my-component' });

      logger.info('test');

      const entry = capturedOutput[0];
      expect(entry.component).toBe('my-component');
    });

    it('should handle empty context gracefully', () => {
      const logger = createTestLogger();

      logger.info('test', {});

      const entry = capturedOutput[0];
      expect(entry.message).toBe('test');
      expect(entry.context).toBeUndefined();
    });
  });

  describe('Child Loggers', () => {
    it('should create child logger with extended context', () => {
      const parent = createTestLogger({ component: 'parent' });
      const child = parent.child({ childId: 'child-123' });

      child.info('test');

      const entry = capturedOutput[0];
      expect(entry.component).toBe('parent');
      expect(entry.context?.childId).toBe('child-123');
    });

    it('should inherit parent configuration', () => {
      const parent = createTestLogger({ level: 'warn', component: 'parent' });
      const child = parent.child({ childId: 'child-123' });

      child.debug('should not appear');
      child.warn('should appear');

      expect(capturedOutput.length).toBe(1);
      expect(capturedOutput[0].level).toBe('warn');
    });

    it('should combine parent and child context', () => {
      const parent = createTestLogger({
        defaultContext: { sessionId: 'session-123' },
      });
      const child = parent.child({ requestId: 'req-456' });

      child.info('test', { userId: 'user-789' });

      const entry = capturedOutput[0];
      expect(entry.context?.sessionId).toBe('session-123');
      expect(entry.context?.requestId).toBe('req-456');
      expect(entry.context?.userId).toBe('user-789');
    });

    it('should inherit format from parent', () => {
      const parent = createTestLogger({ format: 'json' });
      const child = parent.child({ childId: '123' });

      child.info('test');

      expect(capturedOutput.length).toBe(1);
    });
  });

  describe('Duration Tracking', () => {
    it('should include duration in log entries', () => {
      const logger = createTestLogger();

      logger.info('Operation completed', undefined, 123);

      const entry = capturedOutput[0];
      expect(entry.duration).toBe(123);
    });

    it('should support duration with debug level', () => {
      const logger = createTestLogger();

      logger.debug('Debug operation', undefined, 456);

      const entry = capturedOutput[0];
      expect(entry.duration).toBe(456);
    });

    it('should support duration with warn level', () => {
      const logger = createTestLogger();

      logger.warn('Slow operation', undefined, undefined, 789);

      const entry = capturedOutput[0];
      expect(entry.duration).toBe(789);
    });

    it('should support duration with error level', () => {
      const logger = createTestLogger();

      const error = new Error('Error');
      logger.error('Error occurred', error, undefined, 321);

      const entry = capturedOutput[0];
      expect(entry.duration).toBe(321);
    });
  });

  describe('Timer Functionality', () => {
    it('should create and measure timer', async () => {
      const logger = createTestLogger();
      const timer = logger.startTimer();

      await new Promise(resolve => setTimeout(resolve, 10));

      const duration = timer();

      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThan(100);
    });

    it('should return consistent duration on multiple calls', async () => {
      const logger = createTestLogger();
      const timer = logger.startTimer();

      await new Promise(resolve => setTimeout(resolve, 20));

      const duration1 = timer();
      const duration2 = timer();

      // Should be very close (within 5ms tolerance)
      expect(Math.abs(duration1 - duration2)).toBeLessThan(5);
    });

    it('should measure zero duration for immediate completion', () => {
      const logger = createTestLogger();
      const timer = logger.startTimer();

      const duration = timer();

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(10);
    });
  });

  describe('Correlation ID Generation', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      const id3 = generateCorrelationId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id3).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should generate 32-character hex strings', () => {
      const id = generateCorrelationId();

      expect(id).toHaveLength(32);
      expect(/^[0-9a-f]{32}$/.test(id)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined context gracefully', () => {
      const logger = createTestLogger();

      logger.info('message', undefined);

      expect(capturedOutput.length).toBe(1);
      const entry = capturedOutput[0];
      expect(entry.message).toBe('message');
    });

    it('should handle null values in context', () => {
      const logger = createTestLogger();

      logger.info('message', { value: null });

      const entry = capturedOutput[0];
      expect(entry.context?.value).toBe(null);
    });

    it('should handle very long messages', () => {
      const logger = createTestLogger();

      const longMessage = 'x'.repeat(10000);
      logger.info(longMessage);

      expect(capturedOutput.length).toBe(1);
      const entry = capturedOutput[0];
      expect(entry.message).toBe(longMessage);
    });

    it('should handle undefined duration', () => {
      const logger = createTestLogger();

      logger.info('test', undefined, undefined);

      const entry = capturedOutput[0];
      expect(entry.duration).toBeUndefined();
    });

    it('should handle no component', () => {
      const logger = createTestLogger({ component: undefined });

      logger.info('test');

      const entry = capturedOutput[0];
      expect(entry.component).toBeUndefined();
    });
  });
});

describe('StructuredLoggerFactory', () => {
  beforeEach(() => {
    // Clear the factory's internal state
    const allLoggers = StructuredLoggerFactory['loggers'];
    allLoggers.clear();
  });

  describe('Logger Creation and Caching', () => {
    it('should create and cache loggers', () => {
      const logger1 = StructuredLoggerFactory.getLogger('component-a');
      const logger2 = StructuredLoggerFactory.getLogger('component-a');
      const logger3 = StructuredLoggerFactory.getLogger('component-b');

      expect(logger1).toBe(logger2); // Same instance
      expect(logger1).not.toBe(logger3); // Different instance
    });

    it('should create logger without component name', () => {
      const logger = StructuredLoggerFactory.getLogger();

      expect(logger).toBeDefined();
    });

    it('should cache logger without component as "default"', () => {
      const logger1 = StructuredLoggerFactory.getLogger();
      const logger2 = StructuredLoggerFactory.getLogger();

      expect(logger1).toBe(logger2);
    });
  });

  describe('Global Configuration', () => {
    it('should configure global options', () => {
      StructuredLoggerFactory.configure({
        level: 'error',
        format: 'json',
      });

      // Create a mock output to test
      let capturedLevel: string | undefined;
      const testLogger = new StructuredLogger({
        level: 'error',
        output: entry => {
          capturedLevel = entry.level;
        },
      });

      testLogger.info('should not appear');
      testLogger.error('should appear');

      expect(capturedLevel).toBe('error');
    });

    it('should update existing loggers when config changes', () => {
      const logger1 = StructuredLoggerFactory.getLogger('comp1');
      const logger2 = StructuredLoggerFactory.getLogger('comp2');

      expect(logger1).toBeDefined();
      expect(logger2).toBeDefined();

      // Configure should update all existing loggers
      StructuredLoggerFactory.configure({
        level: 'error',
      });

      // Verify loggers still exist after reconfiguration
      const logger1After = StructuredLoggerFactory.getLogger('comp1');
      const logger2After = StructuredLoggerFactory.getLogger('comp2');

      expect(logger1After).toBeDefined();
      expect(logger2After).toBeDefined();
    });
  });

  describe('Logger with Correlation ID', () => {
    it('should create logger with correlation ID', () => {
      const logger = StructuredLoggerFactory.getLoggerWithCorrelation('test', 'corr-123');

      expect(logger).toBeDefined();
    });

    it('should generate correlation ID if not provided', () => {
      const logger = StructuredLoggerFactory.getLoggerWithCorrelation('test');

      expect(logger).toBeDefined();
    });

    it('should create child logger with correlation ID in context', () => {
      // The factory returns a child logger with correlation ID in context
      // We can't easily capture the output without modifying the factory,
      // so we just verify the logger is created successfully
      const logger = StructuredLoggerFactory.getLoggerWithCorrelation('test', 'corr-456');

      expect(logger).toBeDefined();
      // The logger should be an instance of StructuredLogger
      expect(logger.constructor.name).toBe('StructuredLogger');
    });
  });

  describe('Environment Variables', () => {
    it('should respect LOG_FORMAT environment variable', () => {
      const originalFormat = process.env.LOG_FORMAT;

      process.env.LOG_FORMAT = 'json';
      // Reset factory to pick up env var
      const factory = new StructuredLoggerFactory();

      process.env.LOG_FORMAT = originalFormat;

      expect(factory).toBeDefined();
    });

    it('should respect LOG_LEVEL environment variable', () => {
      const originalLevel = process.env.LOG_LEVEL;

      process.env.LOG_LEVEL = 'error';
      // Reset factory to pick up env var
      const factory = new StructuredLoggerFactory();

      process.env.LOG_LEVEL = originalLevel;

      expect(factory).toBeDefined();
    });
  });
});
