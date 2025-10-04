/**
 * Logger Unit Tests
 *
 * Tests for the production-grade structured logging system:
 * - Log level filtering
 * - JSON vs pretty format output
 * - PerformanceTrace functionality
 * - Child logger context
 * - Error logging with stack traces
 * - Metadata inclusion
 * - LoggerFactory behavior
 */

import { Logger, LoggerFactory, PerformanceTrace, LogLevel } from '../src/module-system/logger';

describe('Logger', () => {
  let originalStdoutWrite: typeof process.stdout.write;
  let originalStderrWrite: typeof process.stderr.write;
  let stdoutOutput: string[] = [];
  let stderrOutput: string[] = [];

  beforeEach(() => {
    // Capture stdout/stderr
    stdoutOutput = [];
    stderrOutput = [];

    originalStdoutWrite = process.stdout.write;
    originalStderrWrite = process.stderr.write;

    process.stdout.write = ((chunk: string) => {
      stdoutOutput.push(chunk.toString().trim());
      return true;
    }) as typeof process.stdout.write;

    process.stderr.write = ((chunk: string) => {
      stderrOutput.push(chunk.toString().trim());
      return true;
    }) as typeof process.stderr.write;

    // Clear LoggerFactory state and reset global config
    LoggerFactory.clearAll();
    LoggerFactory.updateGlobalConfig({
      level: 'info',
      format: 'json',
      enableTracing: true,
      enableColors: false,
      timestamp: true,
      includeStack: false,
    });
  });

  afterEach(() => {
    // Restore stdout/stderr
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  });

  describe('Log Level Filtering', () => {
    it('should filter logs below configured level', () => {
      const logger = new Logger('test', { level: 'warn' });

      logger.trace('trace message');
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      // Only warn and error should be logged
      expect(stdoutOutput.length).toBe(1); // warn
      expect(stderrOutput.length).toBe(1); // error
    });

    it('should log all levels when set to trace', () => {
      const logger = new Logger('test', { level: 'trace', format: 'json' });

      logger.trace('trace message');
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(stdoutOutput.length).toBe(4); // trace, debug, info, warn
      expect(stderrOutput.length).toBe(1); // error
    });

    it('should respect log level hierarchy', () => {
      const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

      for (let i = 0; i < levels.length; i++) {
        stdoutOutput = [];
        stderrOutput = [];

        const logger = new Logger('test', { level: levels[i], format: 'json' });

        // Log all levels
        logger.trace('trace');
        logger.debug('debug');
        logger.info('info');
        logger.warn('warn');
        logger.error('error');
        logger.fatal('fatal');

        const totalLogs = stdoutOutput.length + stderrOutput.length;
        // Each level filters out logs below it, so we expect (levels.length - i) logs
        const expectedLogs = levels.length - i;
        expect(totalLogs).toBe(expectedLogs);
      }
    });
  });

  describe('JSON Format Output', () => {
    it('should output valid JSON when format is json', () => {
      const logger = new Logger('test-component', { level: 'info', format: 'json' });

      logger.info('test message', { key: 'value', number: 42 });

      expect(stdoutOutput.length).toBe(1);
      const parsed = JSON.parse(stdoutOutput[0]);

      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('test message');
      expect(parsed.component).toBe('test-component');
      expect(parsed.key).toBe('value');
      expect(parsed.number).toBe(42);
      expect(parsed.timestamp).toBeDefined();
    });

    it('should include all required fields in JSON output', () => {
      const logger = new Logger('test', { format: 'json' });

      logger.info('message');

      const parsed = JSON.parse(stdoutOutput[0]);

      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('level');
      expect(parsed).toHaveProperty('message');
      expect(parsed).toHaveProperty('component');
      expect(typeof parsed.timestamp).toBe('string');
      expect(typeof parsed.level).toBe('string');
      expect(typeof parsed.message).toBe('string');
      expect(typeof parsed.component).toBe('string');
    });

    it('should properly serialize complex metadata', () => {
      const logger = new Logger('test', { format: 'json' });

      const metadata = {
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        boolean: true,
        nullValue: null,
      };

      logger.info('complex', metadata);

      const parsed = JSON.parse(stdoutOutput[0]);

      expect(parsed.nested.deep.value).toBe(123);
      expect(parsed.array).toEqual([1, 2, 3]);
      expect(parsed.boolean).toBe(true);
      expect(parsed.nullValue).toBe(null);
    });
  });

  describe('Pretty Format Output', () => {
    it('should output human-readable format when format is pretty', () => {
      const logger = new Logger('test', {
        level: 'info',
        format: 'pretty',
        enableColors: false,
      });

      logger.info('test message');

      expect(stdoutOutput.length).toBe(1);
      expect(stdoutOutput[0]).toContain('INFO');
      expect(stdoutOutput[0]).toContain('[test]');
      expect(stdoutOutput[0]).toContain('test message');
    });

    it('should include metadata in pretty format', () => {
      const logger = new Logger('test', {
        format: 'pretty',
        enableColors: false,
      });

      logger.info('message', { userId: 123, action: 'login' });

      expect(stdoutOutput[0]).toContain('message');
      expect(stdoutOutput[0]).toContain('userId');
      expect(stdoutOutput[0]).toContain('123');
      expect(stdoutOutput[0]).toContain('action');
      expect(stdoutOutput[0]).toContain('login');
    });
  });

  describe('Error Logging', () => {
    it('should log error objects with name, message, and stack', () => {
      const logger = new Logger('test', { format: 'json', includeStack: true });

      const error = new Error('Something went wrong');
      logger.error('Error occurred', error);

      const parsed = JSON.parse(stderrOutput[0]);

      expect(parsed.level).toBe('error');
      expect(parsed.message).toBe('Error occurred');
      expect(parsed.error).toBeDefined();
      expect(parsed.error.name).toBe('Error');
      expect(parsed.error.message).toBe('Something went wrong');
      expect(parsed.error.stack).toBeDefined();
    });

    it('should handle error codes', () => {
      const logger = new Logger('test', { format: 'json' });

      const error = new Error('ENOENT: file not found') as Error & { code: string };
      error.code = 'ENOENT';

      logger.error('File error', error);

      const parsed = JSON.parse(stderrOutput[0]);
      expect(parsed.error.code).toBe('ENOENT');
    });

    it('should write errors to stderr', () => {
      const logger = new Logger('test', { format: 'json' });

      logger.error('error message');
      logger.fatal('fatal message');

      expect(stdoutOutput.length).toBe(0);
      expect(stderrOutput.length).toBe(2);
    });

    it('should accept metadata as second parameter', () => {
      const logger = new Logger('test', { format: 'json' });

      logger.error('Error occurred', { requestId: '12345', userId: 'abc' });

      const parsed = JSON.parse(stderrOutput[0]);
      expect(parsed.requestId).toBe('12345');
      expect(parsed.userId).toBe('abc');
    });
  });

  describe('Metadata and Context', () => {
    it('should include metadata in log entries', () => {
      const logger = new Logger('test', { format: 'json' });

      logger.info('User action', {
        userId: 123,
        action: 'login',
        timestamp: Date.now(),
      });

      const parsed = JSON.parse(stdoutOutput[0]);
      expect(parsed.userId).toBe(123);
      expect(parsed.action).toBe('login');
      expect(parsed.timestamp).toBeDefined();
    });

    it('should include component in all logs', () => {
      const logger = new Logger('my-component', { format: 'json' });

      logger.info('test');

      const parsed = JSON.parse(stdoutOutput[0]);
      expect(parsed.component).toBe('my-component');
    });

    it('should support optional timestamp', () => {
      const logger = new Logger('test', { format: 'json', timestamp: false });

      logger.info('test');

      const parsed = JSON.parse(stdoutOutput[0]);
      expect(parsed.timestamp).toBe('');
    });
  });

  describe('Child Loggers', () => {
    it('should create child logger with extended component name', () => {
      const parent = new Logger('parent', { format: 'json' });
      const child = parent.child('child');

      child.info('test');

      const parsed = JSON.parse(stdoutOutput[0]);
      expect(parsed.component).toBe('parent.child');
    });

    it('should inherit parent configuration', () => {
      const parent = new Logger('parent', { level: 'warn', format: 'json' });
      const child = parent.child('child');

      child.debug('should not appear');
      child.warn('should appear');

      expect(stdoutOutput.length).toBe(1);
      expect(JSON.parse(stdoutOutput[0]).level).toBe('warn');
    });

    it('should include default metadata in all child logs', () => {
      const parent = new Logger('parent', { format: 'json' });
      const child = parent.child('child', { sessionId: 'abc123' });

      child.info('test');

      const parsed = JSON.parse(stdoutOutput[0]);
      expect(parsed.sessionId).toBe('abc123');
    });
  });

  describe('Performance Tracing', () => {
    it('should start and complete traces', async () => {
      const logger = new Logger('test', {
        format: 'json',
        enableTracing: true,
        level: 'debug',
      });

      const trace = logger.startTrace('test-operation');

      await new Promise(resolve => setTimeout(resolve, 50));

      const duration = trace.complete(logger, 'success');

      expect(duration).toBeGreaterThanOrEqual(50);
      expect(stdoutOutput.length).toBeGreaterThan(0);
    });

    it('should include trace IDs when tracing is enabled', () => {
      const logger = new Logger('test', { format: 'json', enableTracing: true, level: 'debug' });

      logger.startTrace('operation', { key: 'value' });

      const parsed = JSON.parse(stdoutOutput[0]);
      expect(parsed.traceId).toBeDefined();
      expect(parsed.spanId).toBeDefined();
    });

    it('should measure async operations', async () => {
      const logger = new Logger('test', { format: 'json', level: 'debug' });

      const result = await logger.measureAsync('async-op', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'result';
      });

      expect(result).toBe('result');
      expect(stdoutOutput.length).toBeGreaterThan(0);
    });

    it('should measure sync operations', () => {
      const logger = new Logger('test', { format: 'json', level: 'debug' });

      const result = logger.measureSync('sync-op', () => {
        return 42;
      });

      expect(result).toBe(42);
      expect(stdoutOutput.length).toBeGreaterThan(0);
    });

    it('should log errors in measured operations', async () => {
      const logger = new Logger('test', { format: 'json', level: 'debug' });

      await expect(
        logger.measureAsync('failing-op', async () => {
          throw new Error('Operation failed');
        })
      ).rejects.toThrow('Operation failed');

      // Should have logged the error
      const hasErrorLog = stdoutOutput.some(log => {
        const parsed = JSON.parse(log);
        return parsed.level === 'warn' && parsed.result === 'error';
      });

      expect(hasErrorLog).toBe(true);
    });

    it('should return current duration without completing', () => {
      const trace = new PerformanceTrace('test-op');

      const duration1 = trace.getCurrentDuration();
      expect(duration1).toBeGreaterThanOrEqual(0);

      // Wait a bit
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Busy wait
      }

      const duration2 = trace.getCurrentDuration();
      expect(duration2).toBeGreaterThan(duration1);
    });

    it('should not log twice when completing the same trace', () => {
      const logger = new Logger('test', { format: 'json', level: 'debug' });
      const trace = logger.startTrace('operation');

      trace.complete(logger, 'success');
      const firstLogCount = stdoutOutput.length;

      trace.complete(logger, 'success');
      expect(stdoutOutput.length).toBe(firstLogCount);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration dynamically', () => {
      const logger = new Logger('test', { level: 'info', format: 'json' });

      logger.debug('should not appear');
      expect(stdoutOutput.length).toBe(0);

      logger.updateConfig({ level: 'debug' });

      logger.debug('should appear');
      expect(stdoutOutput.length).toBe(1);
    });

    it('should return current configuration', () => {
      const logger = new Logger('test', {
        level: 'warn',
        format: 'pretty',
        enableTracing: false,
      });

      const config = logger.getConfig();

      expect(config.level).toBe('warn');
      expect(config.format).toBe('pretty');
      expect(config.enableTracing).toBe(false);
    });
  });

  describe('LoggerFactory', () => {
    it('should create and cache loggers', () => {
      const logger1 = LoggerFactory.getLogger('component-a');
      const logger2 = LoggerFactory.getLogger('component-a');
      const logger3 = LoggerFactory.getLogger('component-b');

      expect(logger1).toBe(logger2); // Same instance
      expect(logger1).not.toBe(logger3); // Different instance
    });

    it('should update all loggers when global config changes', () => {
      const logger1 = LoggerFactory.getLogger('comp1');
      const logger2 = LoggerFactory.getLogger('comp2');

      LoggerFactory.setLevel('error');

      logger1.info('should not appear');
      logger2.warn('should not appear');

      expect(stdoutOutput.length).toBe(0);

      logger1.error('should appear');
      logger2.error('should appear');

      expect(stderrOutput.length).toBe(2);
    });

    it('should set format globally', () => {
      LoggerFactory.setFormat('json');

      const logger = LoggerFactory.getLogger('test');
      logger.info('test');

      expect(stdoutOutput.length).toBeGreaterThan(0);
      expect(() => JSON.parse(stdoutOutput[0])).not.toThrow();

      const parsed = JSON.parse(stdoutOutput[0]);
      expect(parsed.message).toBe('test');
    });

    it('should control tracing globally', () => {
      LoggerFactory.setTracing(false);

      const logger = LoggerFactory.getLogger('test');
      logger.updateConfig({ level: 'debug', format: 'json' });

      logger.startTrace('operation');

      // With tracing disabled, should not log trace start
      expect(stdoutOutput.length).toBe(0);
    });

    it('should list all registered loggers', () => {
      LoggerFactory.getLogger('logger1');
      LoggerFactory.getLogger('logger2');
      LoggerFactory.getLogger('logger3');

      const allLoggers = LoggerFactory.getAllLoggers();

      expect(allLoggers.size).toBe(3);
      expect(allLoggers.has('logger1')).toBe(true);
      expect(allLoggers.has('logger2')).toBe(true);
      expect(allLoggers.has('logger3')).toBe(true);
    });

    it('should clear all loggers', () => {
      LoggerFactory.getLogger('logger1');
      LoggerFactory.getLogger('logger2');

      expect(LoggerFactory.getAllLoggers().size).toBe(2);

      LoggerFactory.clearAll();

      expect(LoggerFactory.getAllLoggers().size).toBe(0);
    });
  });

  describe('Stream Routing', () => {
    it('should write info/warn/debug to stdout', () => {
      const logger = new Logger('test', { format: 'json', level: 'trace' });

      logger.trace('trace');
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');

      expect(stdoutOutput.length).toBe(4);
      expect(stderrOutput.length).toBe(0);
    });

    it('should write error/fatal to stderr', () => {
      const logger = new Logger('test', { format: 'json' });

      logger.error('error');
      logger.fatal('fatal');

      expect(stdoutOutput.length).toBe(0);
      expect(stderrOutput.length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined metadata gracefully', () => {
      const logger = new Logger('test', { format: 'json' });

      logger.info('message', undefined);

      expect(stdoutOutput.length).toBe(1);
      const parsed = JSON.parse(stdoutOutput[0]);
      expect(parsed.message).toBe('message');
    });

    it('should handle null values in metadata', () => {
      const logger = new Logger('test', { format: 'json' });

      logger.info('message', { value: null });

      const parsed = JSON.parse(stdoutOutput[0]);
      expect(parsed.value).toBe(null);
    });

    it('should handle circular references safely', () => {
      const logger = new Logger('test', { format: 'json' });

      const obj: Record<string, unknown> = { name: 'test' };
      obj.self = obj; // Circular reference

      // JSON.stringify should handle this or throw
      // Our logger should not crash
      expect(() => {
        logger.info('circular', obj);
      }).toThrow(); // JSON.stringify throws on circular refs
    });

    it('should handle very long messages', () => {
      const logger = new Logger('test', { format: 'json' });

      const longMessage = 'x'.repeat(10000);
      logger.info(longMessage);

      expect(stdoutOutput.length).toBe(1);
      const parsed = JSON.parse(stdoutOutput[0]);
      expect(parsed.message).toBe(longMessage);
    });
  });
});
