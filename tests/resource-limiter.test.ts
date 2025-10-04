import { ResourceLimiter } from '../src/module-system/resource-limiter';

describe('ResourceLimiter', () => {
  describe('constructor', () => {
    test('should use default limits when none provided', () => {
      const limiter = new ResourceLimiter();
      const usage = limiter.getUsage();

      expect(usage.memoryLimit).toBeGreaterThan(0);
      expect(usage.cachedModules).toBe(0);
      expect(usage.fileHandles).toBe(0);
    });

    test('should use custom limits when provided', () => {
      const customLimits = {
        maxMemoryBytes: 100 * 1024 * 1024, // 100MB
        maxFileHandles: 500,
        maxCachedModules: 5000,
        checkInterval: 1000,
      };

      const limiter = new ResourceLimiter(customLimits);
      const usage = limiter.getUsage();

      expect(usage.memoryLimit).toBe(customLimits.maxMemoryBytes);
    });
  });

  describe('module tracking', () => {
    test('should track module count', () => {
      const limiter = new ResourceLimiter({ maxCachedModules: 10 });

      expect(limiter.canLoadModule()).toBe(true);
      limiter.incrementModules();
      expect(limiter.getUsage().cachedModules).toBe(1);

      limiter.incrementModules();
      expect(limiter.getUsage().cachedModules).toBe(2);

      limiter.decrementModules();
      expect(limiter.getUsage().cachedModules).toBe(1);
    });

    test('should respect module limit', () => {
      const limiter = new ResourceLimiter({ maxCachedModules: 2 });

      expect(limiter.canLoadModule()).toBe(true);
      limiter.incrementModules();

      expect(limiter.canLoadModule()).toBe(true);
      limiter.incrementModules();

      expect(limiter.canLoadModule()).toBe(false);
    });

    test('should not go below zero on decrement', () => {
      const limiter = new ResourceLimiter();

      limiter.decrementModules();
      limiter.decrementModules();

      expect(limiter.getUsage().cachedModules).toBe(0);
    });

    test('should set module count explicitly', () => {
      const limiter = new ResourceLimiter();

      limiter.setModuleCount(100);
      expect(limiter.getUsage().cachedModules).toBe(100);

      limiter.setModuleCount(0);
      expect(limiter.getUsage().cachedModules).toBe(0);

      // Should not allow negative
      limiter.setModuleCount(-5);
      expect(limiter.getUsage().cachedModules).toBe(0);
    });
  });

  describe('file handle tracking', () => {
    test('should track file handle count', () => {
      const limiter = new ResourceLimiter({ maxFileHandles: 10 });

      expect(limiter.canOpenFile()).toBe(true);
      limiter.incrementFileHandles();
      expect(limiter.getUsage().fileHandles).toBe(1);

      limiter.incrementFileHandles();
      expect(limiter.getUsage().fileHandles).toBe(2);

      limiter.decrementFileHandles();
      expect(limiter.getUsage().fileHandles).toBe(1);
    });

    test('should respect file handle limit', () => {
      const limiter = new ResourceLimiter({ maxFileHandles: 2 });

      expect(limiter.canOpenFile()).toBe(true);
      limiter.incrementFileHandles();

      expect(limiter.canOpenFile()).toBe(true);
      limiter.incrementFileHandles();

      expect(limiter.canOpenFile()).toBe(false);
    });

    test('should not go below zero on decrement', () => {
      const limiter = new ResourceLimiter();

      limiter.decrementFileHandles();
      limiter.decrementFileHandles();

      expect(limiter.getUsage().fileHandles).toBe(0);
    });
  });

  describe('resource monitoring', () => {
    test('should start and stop monitoring', () => {
      jest.useFakeTimers();

      const limiter = new ResourceLimiter({ checkInterval: 1000 });
      limiter.start();

      // Should not throw
      limiter.stop();

      jest.useRealTimers();
    });

    test('should not start monitoring twice', () => {
      jest.useFakeTimers();

      const limiter = new ResourceLimiter({ checkInterval: 1000 });
      limiter.start();
      limiter.start(); // Should be ignored

      limiter.stop();

      jest.useRealTimers();
    });

    test('should trigger warning callback when limits approached', done => {
      jest.useFakeTimers();

      const limiter = new ResourceLimiter({
        maxCachedModules: 100,
        checkInterval: 100,
      });

      limiter.onWarning((usage, limit) => {
        expect(limit).toBe('cached_modules');
        expect(usage.cachedModules).toBe(95);
        limiter.stop();
        jest.useRealTimers();
        done();
      });

      // Set modules to 95% of limit
      limiter.setModuleCount(95);

      limiter.start();

      // Trigger check
      jest.advanceTimersByTime(150);
    });
  });

  describe('usage reporting', () => {
    test('should report current resource usage', () => {
      const limiter = new ResourceLimiter({
        maxMemoryBytes: 1024 * 1024,
        maxFileHandles: 100,
        maxCachedModules: 1000,
      });

      limiter.incrementModules();
      limiter.incrementFileHandles();

      const usage = limiter.getUsage();

      expect(usage).toMatchObject({
        memoryLimit: 1024 * 1024,
        cachedModules: 1,
        fileHandles: 1,
      });

      expect(usage.memoryUsed).toBeGreaterThan(0);
      expect(usage.memoryPercent).toBeGreaterThan(0);
      expect(usage.heapUsed).toBeGreaterThan(0);
      expect(usage.heapTotal).toBeGreaterThan(0);
    });

    test('should calculate memory percentage correctly', () => {
      const limiter = new ResourceLimiter({
        maxMemoryBytes: 1024 * 1024 * 1024, // 1GB
      });

      const usage = limiter.getUsage();

      expect(usage.memoryPercent).toBeLessThan(100);
      expect(usage.memoryPercent).toBeGreaterThanOrEqual(0);
    });
  });

  describe('garbage collection', () => {
    test('should attempt to force GC if available', () => {
      const limiter = new ResourceLimiter();
      const originalGC = (global as typeof global & { gc?: () => void }).gc;

      const mockGC = jest.fn();
      (global as typeof global & { gc?: () => void }).gc = mockGC;

      limiter.forceGC();

      expect(mockGC).toHaveBeenCalled();

      (global as typeof global & { gc?: () => void }).gc = originalGC;
    });

    test('should not throw if GC not available', () => {
      const limiter = new ResourceLimiter();
      const originalGC = (global as typeof global & { gc?: () => void }).gc;

      (global as typeof global & { gc?: () => void }).gc = undefined;

      expect(() => limiter.forceGC()).not.toThrow();

      (global as typeof global & { gc?: () => void }).gc = originalGC;
    });
  });

  describe('warning callbacks', () => {
    test('should support multiple warning callbacks', () => {
      jest.useFakeTimers();

      const limiter = new ResourceLimiter({
        maxCachedModules: 10,
        checkInterval: 100,
      });

      const callback1 = jest.fn();
      const callback2 = jest.fn();

      limiter.onWarning(callback1);
      limiter.onWarning(callback2);

      limiter.setModuleCount(10); // 100% of limit
      limiter.start();

      jest.advanceTimersByTime(150);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();

      limiter.stop();
      jest.useRealTimers();
    });

    test('should not crash if callback throws', () => {
      jest.useFakeTimers();

      const limiter = new ResourceLimiter({
        maxCachedModules: 10,
        checkInterval: 100,
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      limiter.onWarning(() => {
        throw new Error('Callback error');
      });

      limiter.setModuleCount(10);
      limiter.start();

      jest.advanceTimersByTime(150);

      expect(consoleSpy).toHaveBeenCalled();

      limiter.stop();
      consoleSpy.mockRestore();
      jest.useRealTimers();
    });
  });
});
