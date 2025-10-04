import {
  withTimeout,
  createTimeoutWrapper,
  allWithTimeout,
  TimeoutError,
  AggregateTimeoutError,
} from '../src/module-system/async-timeout';

describe('async-timeout', () => {
  describe('withTimeout', () => {
    test('should resolve if promise completes before timeout', async () => {
      const promise = Promise.resolve('success');

      const result = await withTimeout(promise, {
        timeout: 1000,
        operation: 'test',
      });

      expect(result).toBe('success');
    });

    test('should reject with TimeoutError if promise takes too long', async () => {
      jest.useFakeTimers();

      const promise = new Promise(resolve => setTimeout(resolve, 5000));

      const timeoutPromise = withTimeout(promise, {
        timeout: 1000,
        operation: 'slow operation',
      });

      jest.advanceTimersByTime(1100);

      await expect(timeoutPromise).rejects.toThrow(TimeoutError);
      await expect(timeoutPromise).rejects.toThrow(
        "Operation 'slow operation' timed out after 1000ms"
      );

      jest.useRealTimers();
    });

    test('should use custom error message if provided', async () => {
      jest.useFakeTimers();

      const promise = new Promise(resolve => setTimeout(resolve, 5000));

      const timeoutPromise = withTimeout(promise, {
        timeout: 1000,
        errorMessage: 'Custom timeout message',
      });

      jest.advanceTimersByTime(1100);

      await expect(timeoutPromise).rejects.toThrow('Custom timeout message');

      jest.useRealTimers();
    });

    test('should clear timeout when promise resolves', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const promise = Promise.resolve('success');

      await withTimeout(promise, {
        timeout: 1000,
        operation: 'test',
      });

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    test('should clear timeout when promise rejects', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const promise = Promise.reject(new Error('test error'));

      await expect(
        withTimeout(promise, {
          timeout: 1000,
          operation: 'test',
        })
      ).rejects.toThrow('test error');

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    test('should handle promise rejection before timeout', async () => {
      const promise = Promise.reject(new Error('Promise error'));

      await expect(
        withTimeout(promise, {
          timeout: 1000,
          operation: 'test',
        })
      ).rejects.toThrow('Promise error');
    });
  });

  describe('TimeoutError', () => {
    test('should create error with correct properties', () => {
      const error = new TimeoutError('Test timeout', 5000, 'testOp');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TimeoutError);
      expect(error.message).toBe('Test timeout');
      expect(error.timeout).toBe(5000);
      expect(error.operation).toBe('testOp');
      expect(error.name).toBe('TimeoutError');
    });

    test('should have proper stack trace', () => {
      const error = new TimeoutError('Test timeout', 1000);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('TimeoutError');
    });
  });

  describe('createTimeoutWrapper', () => {
    test('should create reusable timeout wrapper with default timeout', async () => {
      const wrapper = createTimeoutWrapper(1000);

      const promise = Promise.resolve('success');
      const result = await wrapper(promise);

      expect(result).toBe('success');
    });

    test('should allow override of default timeout', async () => {
      jest.useFakeTimers();

      const wrapper = createTimeoutWrapper(5000);

      const promise = new Promise(resolve => setTimeout(resolve, 2000));

      const timeoutPromise = wrapper(promise, { timeout: 1000 });

      jest.advanceTimersByTime(1100);

      await expect(timeoutPromise).rejects.toThrow(TimeoutError);

      jest.useRealTimers();
    });

    test('should use default timeout if not overridden', async () => {
      jest.useFakeTimers();

      const wrapper = createTimeoutWrapper(1000);

      const promise = new Promise(resolve => setTimeout(resolve, 5000));

      const timeoutPromise = wrapper(promise);

      jest.advanceTimersByTime(1100);

      await expect(timeoutPromise).rejects.toThrow(TimeoutError);

      jest.useRealTimers();
    });
  });

  describe('allWithTimeout', () => {
    test('should resolve all promises that complete before timeout', async () => {
      const promises = [
        { promise: Promise.resolve(1), options: { timeout: 1000, operation: 'op1' } },
        { promise: Promise.resolve(2), options: { timeout: 1000, operation: 'op2' } },
        { promise: Promise.resolve(3), options: { timeout: 1000, operation: 'op3' } },
      ];

      const results = await allWithTimeout(promises);

      expect(results).toEqual([1, 2, 3]);
    });

    test('should throw AggregateTimeoutError if any promise times out (failFast: false)', async () => {
      jest.useFakeTimers();

      const promises = [
        { promise: Promise.resolve(1), options: { timeout: 1000, operation: 'op1' } },
        {
          promise: new Promise(resolve => setTimeout(resolve, 5000)),
          options: { timeout: 1000, operation: 'op2' },
        },
        { promise: Promise.resolve(3), options: { timeout: 1000, operation: 'op3' } },
      ];

      const allPromise = allWithTimeout(promises);

      jest.advanceTimersByTime(1100);

      await expect(allPromise).rejects.toThrow(AggregateTimeoutError);

      const error = await allPromise.catch(e => e);
      expect(error.errors).toHaveLength(1);
      expect(error.errors[0]).toBeInstanceOf(TimeoutError);

      jest.useRealTimers();
    });

    test('should fail fast if any promise times out (failFast: true)', async () => {
      jest.useFakeTimers();

      const promises = [
        { promise: Promise.resolve(1), options: { timeout: 1000, operation: 'op1' } },
        {
          promise: new Promise(resolve => setTimeout(resolve, 5000)),
          options: { timeout: 1000, operation: 'op2' },
        },
        { promise: Promise.resolve(3), options: { timeout: 1000, operation: 'op3' } },
      ];

      const allPromise = allWithTimeout(promises, { failFast: true });

      jest.advanceTimersByTime(1100);

      await expect(allPromise).rejects.toThrow(TimeoutError);

      jest.useRealTimers();
    });

    test('should handle empty array', async () => {
      const results = await allWithTimeout([]);

      expect(results).toEqual([]);
    });

    test('should handle mix of successful and failed promises', async () => {
      jest.useFakeTimers();

      const promises = [
        { promise: Promise.resolve(1), options: { timeout: 1000, operation: 'op1' } },
        {
          promise: new Promise(resolve => setTimeout(resolve, 2000)),
          options: { timeout: 1000, operation: 'op2' },
        },
        {
          promise: new Promise(resolve => setTimeout(resolve, 3000)),
          options: { timeout: 1000, operation: 'op3' },
        },
      ];

      const allPromise = allWithTimeout(promises);

      jest.advanceTimersByTime(1100);

      const error = await allPromise.catch(e => e);

      expect(error).toBeInstanceOf(AggregateTimeoutError);
      expect(error.errors).toHaveLength(2);

      jest.useRealTimers();
    });
  });

  describe('AggregateTimeoutError', () => {
    test('should aggregate multiple errors', () => {
      const errors = [
        new TimeoutError('Error 1', 1000, 'op1'),
        new TimeoutError('Error 2', 1000, 'op2'),
        new TimeoutError('Error 3', 1000, 'op3'),
      ];

      const aggregateError = new AggregateTimeoutError(errors);

      expect(aggregateError).toBeInstanceOf(Error);
      expect(aggregateError).toBeInstanceOf(AggregateTimeoutError);
      expect(aggregateError.errors).toEqual(errors);
      expect(aggregateError.message).toContain('3 failures');
      expect(aggregateError.name).toBe('AggregateTimeoutError');
    });

    test('should have proper stack trace', () => {
      const errors = [new TimeoutError('Error 1', 1000)];
      const aggregateError = new AggregateTimeoutError(errors);

      expect(aggregateError.stack).toBeDefined();
      expect(aggregateError.stack).toContain('AggregateTimeoutError');
    });
  });
});
