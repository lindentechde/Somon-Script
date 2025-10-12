import { SignalHandler } from '../src/module-system/signal-handler';

describe('SignalHandler', () => {
  let originalProcessOn: typeof process.on;
  let originalProcessOff: typeof process.off;
  let originalProcessExit: typeof process.exit;
  let signalListeners: Map<string, Set<(...args: unknown[]) => void>>;

  beforeEach(() => {
    // Mock process.on and process.off
    signalListeners = new Map();
    originalProcessOn = process.on;
    originalProcessOff = process.off;
    originalProcessExit = process.exit;

    process.on = jest.fn((event: string, listener: (...args: unknown[]) => void) => {
      if (!signalListeners.has(event)) {
        signalListeners.set(event, new Set());
      }
      signalListeners.get(event)!.add(listener);
      return process;
    }) as typeof process.on;

    process.off = jest.fn((event: string, listener: (...args: unknown[]) => void) => {
      const listeners = signalListeners.get(event);
      if (listeners) {
        listeners.delete(listener);
      }
      return process;
    }) as typeof process.off;

    process.exit = jest.fn() as typeof process.exit;
  });

  afterEach(() => {
    process.on = originalProcessOn;
    process.off = originalProcessOff;
    process.exit = originalProcessExit;
    signalListeners.clear();
  });

  describe('install/uninstall', () => {
    test('should install signal handlers for SIGTERM, SIGINT, SIGHUP', () => {
      const handler = new SignalHandler();
      handler.install();

      expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('SIGHUP', expect.any(Function));
    });

    test('should uninstall signal handlers', () => {
      const handler = new SignalHandler();
      handler.install();

      handler.uninstall();

      expect(process.off).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(process.off).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(process.off).toHaveBeenCalledWith('SIGHUP', expect.any(Function));
    });
  });

  describe('shutdown handlers', () => {
    test('should execute registered handlers on signal', async () => {
      const handler = new SignalHandler({ shutdownTimeout: 1000 });
      const mockHandler = jest.fn().mockResolvedValue(undefined);

      handler.register(mockHandler);
      handler.install();

      // Trigger SIGTERM
      const sigtermListeners = signalListeners.get('SIGTERM');
      expect(sigtermListeners).toBeDefined();
      expect(sigtermListeners!.size).toBe(1);

      const listener = Array.from(sigtermListeners!)[0];
      await listener('SIGTERM');

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    test('should execute multiple handlers in order', async () => {
      const handler = new SignalHandler({ shutdownTimeout: 1000 });
      const order: number[] = [];

      handler.register(async () => {
        order.push(1);
      });
      handler.register(async () => {
        order.push(2);
      });
      handler.register(async () => {
        order.push(3);
      });

      handler.install();

      const sigtermListeners = signalListeners.get('SIGTERM');
      const listener = Array.from(sigtermListeners!)[0];
      await listener('SIGTERM');

      expect(order).toEqual([1, 2, 3]);
    });

    test('should handle async handlers', async () => {
      const handler = new SignalHandler({ shutdownTimeout: 1000 });
      let completed = false;

      handler.register(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        completed = true;
      });

      handler.install();

      const sigtermListeners = signalListeners.get('SIGTERM');
      const listener = Array.from(sigtermListeners!)[0];
      await listener('SIGTERM');

      expect(completed).toBe(true);
    });

    test('should ignore duplicate shutdown signals', async () => {
      const handler = new SignalHandler({ shutdownTimeout: 1000 });
      const mockHandler = jest.fn().mockResolvedValue(undefined);

      handler.register(mockHandler);
      handler.install();

      const sigtermListeners = signalListeners.get('SIGTERM');
      const listener = Array.from(sigtermListeners!)[0];

      // Trigger multiple times
      const promise1 = listener('SIGTERM');
      const promise2 = listener('SIGTERM');

      await Promise.all([promise1, promise2]);

      // Handler should only be called once
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeout handling', () => {
    test('should timeout if handlers take too long', async () => {
      jest.useFakeTimers();

      const handler = new SignalHandler({ shutdownTimeout: 1000 });

      handler.register(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
      });

      handler.install();

      const sigtermListeners = signalListeners.get('SIGTERM');
      const listener = Array.from(sigtermListeners!)[0];

      const shutdownPromise = listener('SIGTERM');

      // Advance timers past the timeout
      jest.advanceTimersByTime(1100);

      await shutdownPromise;

      expect(process.exit).toHaveBeenCalledWith(1);

      jest.useRealTimers();
    });
  });

  describe('error handling', () => {
    test('should exit with error code if handler fails', async () => {
      const handler = new SignalHandler({ shutdownTimeout: 1000 });

      handler.register(async () => {
        throw new Error('Handler failed');
      });

      handler.install();

      const sigtermListeners = signalListeners.get('SIGTERM');
      const listener = Array.from(sigtermListeners!)[0];
      await listener('SIGTERM');

      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('should continue with other handlers if one fails', async () => {
      const handler = new SignalHandler({ shutdownTimeout: 1000 });
      const successHandler = jest.fn().mockResolvedValue(undefined);

      handler.register(async () => {
        throw new Error('Handler failed');
      });
      handler.register(successHandler);

      handler.install();

      const sigtermListeners = signalListeners.get('SIGTERM');
      const listener = Array.from(sigtermListeners!)[0];
      await listener('SIGTERM');

      // Second handler should still be called
      expect(successHandler).toHaveBeenCalledTimes(1);
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('with logger', () => {
    test('should log shutdown events when logger provided', async () => {
      const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const handler = new SignalHandler({
        shutdownTimeout: 1000,
        logger: mockLogger,
      });

      handler.register(jest.fn().mockResolvedValue(undefined));
      handler.install();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Signal handlers installed',
        expect.objectContaining({
          signals: ['SIGTERM', 'SIGINT', 'SIGHUP'],
        })
      );

      const sigtermListeners = signalListeners.get('SIGTERM');
      const listener = Array.from(sigtermListeners!)[0];
      await listener('SIGTERM');

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Received shutdown signal, starting graceful shutdown',
        expect.any(Object)
      );
    });
  });
});
