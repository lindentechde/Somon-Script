/**
 * Circuit Breaker Lifecycle Tests
 *
 * Tests for proper resource cleanup and timer management:
 * - Timer tracking and cleanup
 * - Shutdown behavior
 * - Resource leak prevention
 * - State transitions
 */

import { CircuitBreaker, CircuitBreakerManager } from '../src/module-system/circuit-breaker';

describe('CircuitBreaker - Resource Management', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeout: 1000,
      monitoringPeriod: 5000,
    });
  });

  afterEach(() => {
    // Always cleanup
    if (breaker && !breaker.isShutdown()) {
      breaker.shutdown();
    }
  });

  describe('Timer Management', () => {
    it('should track active timers during retry', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));

      // Start a retry operation (will create timers)
      const promise = breaker.executeWithRetry(operation, {
        maxRetries: 2,
        initialDelay: 100,
      });

      // Give it time to create first timer
      await new Promise(resolve => setTimeout(resolve, 10));

      // @ts-expect-error - accessing private property for testing
      const timerCount = breaker.activeTimers.size;
      expect(timerCount).toBeGreaterThan(0);

      // Let it complete
      await expect(promise).rejects.toThrow();

      // Timers should be cleaned up after completion
      // @ts-expect-error - accessing private property for testing
      expect(breaker.activeTimers.size).toBe(0);
    });

    it('should cleanup timers on shutdown', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));

      // Start retry that will create multiple timers
      const promise = breaker.executeWithRetry(operation, {
        maxRetries: 5,
        initialDelay: 1000, // Long delay
      });

      // Wait for first timer to be created
      await new Promise(resolve => setTimeout(resolve, 50));

      // @ts-expect-error - accessing private property for testing
      expect(breaker.activeTimers.size).toBeGreaterThan(0);

      // Shutdown should clear all timers
      breaker.shutdown();

      // @ts-expect-error - accessing private property for testing
      expect(breaker.activeTimers.size).toBe(0);

      // Promise should reject quickly
      await expect(promise).rejects.toThrow('shutting down');
    }, 5000); // 5 second timeout

    it('should not create new timers after shutdown', async () => {
      breaker.shutdown();

      const operation = jest.fn().mockResolvedValue('success');

      await expect(breaker.execute(operation)).rejects.toThrow('shutting down');

      // @ts-expect-error - accessing private property for testing
      expect(breaker.activeTimers.size).toBe(0);
    });

    it('should prevent timer leaks with multiple concurrent operations', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));

      // Start multiple concurrent retry operations
      const promises = Array.from({ length: 5 }, () =>
        breaker.executeWithRetry(operation, { maxRetries: 2, initialDelay: 50 })
      );

      // Wait a bit for timers to be created
      await new Promise(resolve => setTimeout(resolve, 30));

      // Shutdown to cancel all
      breaker.shutdown();

      // All should reject quickly
      await Promise.allSettled(promises);

      // No timer leaks
      // @ts-expect-error - accessing private property for testing
      expect(breaker.activeTimers.size).toBe(0);
    }, 5000); // 5 second timeout
  });

  describe('Shutdown Behavior', () => {
    it('should prevent new operations after shutdown', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      breaker.shutdown();

      expect(breaker.isShutdown()).toBe(true);
      await expect(breaker.execute(operation)).rejects.toThrow('shutting down');
    });

    it('should be idempotent', () => {
      breaker.shutdown();
      expect(breaker.isShutdown()).toBe(true);

      // Second shutdown should be safe
      expect(() => breaker.shutdown()).not.toThrow();
      expect(breaker.isShutdown()).toBe(true);
    });

    it('should cleanup state properly', () => {
      // Create some state
      breaker.forceOpen(5000);
      expect(breaker.getState().state).toBe('open');

      // @ts-expect-error - accessing private property for testing
      expect(breaker.isShuttingDown).toBe(false);

      breaker.shutdown();

      // @ts-expect-error - accessing private property for testing
      expect(breaker.isShuttingDown).toBe(true);
      // @ts-expect-error - accessing private property for testing
      expect(breaker.activeTimers.size).toBe(0);
    });
  });

  describe('Circuit State Transitions', () => {
    it('should cleanup timers when circuit opens', async () => {
      const failingOp = jest.fn().mockRejectedValue(new Error('Fail'));

      // Cause failures to open circuit
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(failingOp)).rejects.toThrow();
      }

      expect(breaker.getState().state).toBe('open');

      // Start retry (creates timer)
      const promise = breaker.executeWithRetry(failingOp, {
        maxRetries: 2,
        initialDelay: 100,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // Shutdown during retry
      breaker.shutdown();

      await expect(promise).rejects.toThrow('shutting down');

      // @ts-expect-error - accessing private property for testing
      expect(breaker.activeTimers.size).toBe(0);
    }, 5000); // 5 second timeout

    it('should handle shutdown in half-open state', async () => {
      // Open the circuit
      breaker.forceOpen(100);
      expect(breaker.getState().state).toBe('open');

      // Wait for it to transition to half-open
      await new Promise(resolve => setTimeout(resolve, 150));

      // Check state - will transition on next operation
      const operation = jest.fn().mockResolvedValue('success');

      // This should trigger half-open state
      try {
        await breaker.execute(operation);
      } catch {
        // May fail if still open
      }

      // Shutdown regardless of state
      breaker.shutdown();

      expect(breaker.isShutdown()).toBe(true);
      // @ts-expect-error - accessing private property for testing
      expect(breaker.activeTimers.size).toBe(0);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle operation errors without leaking timers', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(
        breaker.executeWithRetry(operation, { maxRetries: 3, initialDelay: 50 })
      ).rejects.toThrow();

      // All timers should be cleaned up
      // @ts-expect-error - accessing private property for testing
      expect(breaker.activeTimers.size).toBe(0);
    });

    it('should handle synchronous operation errors', async () => {
      const operation = jest.fn(() => {
        throw new Error('Sync error');
      });

      await expect(breaker.execute(operation as any)).rejects.toThrow();

      // @ts-expect-error - accessing private property for testing
      expect(breaker.activeTimers.size).toBe(0);
    });

    it('should cleanup on operation timeout', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fail'));

      const promise = breaker.executeWithRetry(operation, {
        maxRetries: 2,
        initialDelay: 1000, // Long delay
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      // Shutdown while retry is in progress
      breaker.shutdown();

      await expect(promise).rejects.toThrow('shutting down');

      // @ts-expect-error - accessing private property for testing
      expect(breaker.activeTimers.size).toBe(0);
    });
  });
});

describe('CircuitBreakerManager - Resource Management', () => {
  let manager: CircuitBreakerManager;

  beforeEach(() => {
    manager = new CircuitBreakerManager({
      failureThreshold: 3,
      recoveryTimeout: 1000,
    });
  });

  afterEach(async () => {
    // Give any pending promises a moment to settle
    await new Promise(resolve => setTimeout(resolve, 10));

    try {
      manager.shutdown();
    } catch (error) {
      // Ignore errors during cleanup - may have already shut down
    }
  });

  describe('Shutdown Behavior', () => {
    it('should shutdown all managed breakers', () => {
      const breaker1 = manager.getBreaker('module1');
      const breaker2 = manager.getBreaker('module2');
      const breaker3 = manager.getBreaker('module3');

      expect(breaker1.isShutdown()).toBe(false);
      expect(breaker2.isShutdown()).toBe(false);
      expect(breaker3.isShutdown()).toBe(false);

      manager.shutdown();

      expect(breaker1.isShutdown()).toBe(true);
      expect(breaker2.isShutdown()).toBe(true);
      expect(breaker3.isShutdown()).toBe(true);
    });

    it('should clear all breakers map', () => {
      manager.getBreaker('module1');
      manager.getBreaker('module2');

      const statusBefore = manager.getAllStatus();
      expect(Object.keys(statusBefore).length).toBe(2);

      manager.shutdown();

      const statusAfter = manager.getAllStatus();
      expect(Object.keys(statusAfter).length).toBe(0);
    });

    it('should cleanup all timers across all breakers', async () => {
      const failOp = jest.fn().mockRejectedValue(new Error('Fail'));

      // Start retry operations on multiple breakers
      const promises = [
        manager.executeWithRetry('module1', failOp, { maxRetries: 3, initialDelay: 100 }),
        manager.executeWithRetry('module2', failOp, { maxRetries: 3, initialDelay: 100 }),
        manager.executeWithRetry('module3', failOp, { maxRetries: 3, initialDelay: 100 }),
      ];

      // Wait for timers to be created
      await new Promise(resolve => setTimeout(resolve, 50));

      const timerCount = manager.getActiveTimerCount();
      expect(timerCount).toBeGreaterThan(0);

      // Shutdown should cleanup all
      manager.shutdown();

      expect(manager.getActiveTimerCount()).toBe(0);

      // All promises should reject quickly
      await Promise.allSettled(promises);
    }, 5000); // 5 second timeout
  });

  describe('Timer Tracking', () => {
    it('should track active timers across multiple breakers', async () => {
      const failOp = jest.fn().mockRejectedValue(new Error('Fail'));

      const promise1 = manager.executeWithRetry('module1', failOp, {
        maxRetries: 2,
        initialDelay: 100,
      });
      const promise2 = manager.executeWithRetry('module2', failOp, {
        maxRetries: 2,
        initialDelay: 100,
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      const timerCount = manager.getActiveTimerCount();
      expect(timerCount).toBeGreaterThan(0);

      // Cleanup: wait for promises to complete
      await Promise.allSettled([promise1, promise2]);
    });

    it('should not leak timers when breaker is removed', async () => {
      const failOp = jest.fn().mockRejectedValue(new Error('Fail'));

      const promise = manager.executeWithRetry('module1', failOp, {
        maxRetries: 5,
        initialDelay: 200,
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(manager.getActiveTimerCount()).toBeGreaterThan(0);

      // Get breaker and shutdown before removing
      const breaker = manager.getBreaker('module1');
      breaker.shutdown();

      manager.removeBreaker('module1');

      await expect(promise).rejects.toThrow('shutting down');

      // Wait for promise rejection to fully propagate
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(manager.getActiveTimerCount()).toBe(0);
    }, 5000); // 5 second timeout
  });

  describe('Integration Tests', () => {
    it('should handle mixed operations across multiple breakers', async () => {
      const successOp = jest.fn().mockResolvedValue('success');
      const failOp = jest.fn().mockRejectedValue(new Error('fail'));

      const promises = [
        manager.execute('module1', successOp),
        manager.executeWithRetry('module2', failOp, { maxRetries: 2, initialDelay: 50 }),
        manager.execute('module3', successOp),
      ];

      await Promise.allSettled(promises);

      // Should not leak timers
      expect(manager.getActiveTimerCount()).toBe(0);
    });

    it('should maintain health after cleanup', async () => {
      const successOp = jest.fn().mockResolvedValue('success');

      await manager.execute('module1', successOp);
      await manager.execute('module2', successOp);

      const healthBefore = manager.getOverallHealth();
      expect(healthBefore.totalBreakers).toBe(2);
      expect(healthBefore.healthy).toBe(true);

      manager.shutdown();

      const healthAfter = manager.getOverallHealth();
      expect(healthAfter.totalBreakers).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle shutdown with no active breakers', () => {
      expect(() => manager.shutdown()).not.toThrow();
      expect(manager.getActiveTimerCount()).toBe(0);
    });

    it('should handle repeated shutdowns', () => {
      manager.getBreaker('module1');

      manager.shutdown();
      expect(() => manager.shutdown()).not.toThrow();

      expect(manager.getActiveTimerCount()).toBe(0);
    });

    it('should not create timers after manager shutdown', async () => {
      // Create a breaker first
      const breaker = manager.getBreaker('module1');

      // Shutdown manager (which shuts down all breakers)
      manager.shutdown();

      const operation = jest.fn().mockResolvedValue('success');

      // Breaker should be shut down
      await expect(breaker.execute(operation)).rejects.toThrow('shutting down');

      expect(manager.getActiveTimerCount()).toBe(0);
    });
  });
});
