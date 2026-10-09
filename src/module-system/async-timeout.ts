/**
 * Timeout protection for async operations.
 *
 * These helpers stop *waiting* for a promise after a deadline; they cannot cancel the
 * underlying work. A timed-out operation keeps running in the background, and a
 * synchronous (blocking) operation cannot be interrupted at all, because the timer
 * only fires once the event loop is free again.
 */

export interface TimeoutOptions {
  /** Timeout in milliseconds */
  timeout: number;
  /** Operation name for error messages */
  operation?: string;
  /** Custom error message */
  errorMessage?: string;
}

/**
 * Wrap an async operation with a timeout
 */
export async function withTimeout<T>(promise: Promise<T>, options: TimeoutOptions): Promise<T> {
  const { timeout, operation, errorMessage } = options;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const defaultMessage = operation
        ? `Operation '${operation}' timed out after ${timeout}ms`
        : `Operation timed out after ${timeout}ms`;

      reject(new TimeoutError(errorMessage || defaultMessage, timeout, operation));
    }, timeout);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Custom error for timeout operations
 */
export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeout: number, // eslint-disable-line no-unused-vars
    public readonly operation?: string // eslint-disable-line no-unused-vars
  ) {
    super(message);
    this.name = 'TimeoutError';

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TimeoutError);
    }
  }
}

/**
 * Create a timeout wrapper function for repeated use
 */
export function createTimeoutWrapper(defaultTimeout: number) {
  return <T>(promise: Promise<T>, options?: Partial<TimeoutOptions>): Promise<T> => {
    return withTimeout(promise, {
      timeout: options?.timeout ?? defaultTimeout,
      operation: options?.operation,
      errorMessage: options?.errorMessage,
    });
  };
}

/**
 * Wrap multiple promises with individual timeouts.
 *
 * Without `failFast`, all promises are awaited; if some fail, the error is an
 * AggregateTimeoutError when every failure was a TimeoutError, and otherwise a
 * standard AggregateError ("N of M operations failed") holding the original errors.
 */
export async function allWithTimeout<T>(
  promises: Array<{ promise: Promise<T>; options: TimeoutOptions }>,
  options?: {
    /** Fail fast on first timeout (default: false) */
    failFast?: boolean;
  }
): Promise<T[]> {
  const wrappedPromises = promises.map(({ promise, options: opts }) => withTimeout(promise, opts));

  if (options?.failFast) {
    return Promise.all(wrappedPromises);
  } else {
    const results = await Promise.allSettled(wrappedPromises);
    const failures = results.filter(r => r.status === 'rejected');

    if (failures.length > 0) {
      const errors = failures.map(f => (f as PromiseRejectedResult).reason);
      const timeouts = errors.filter(error => error instanceof TimeoutError).length;
      if (timeouts === errors.length) {
        throw new AggregateTimeoutError(errors);
      }
      const timeoutInfo = timeouts > 0 ? ` (${timeouts} timed out)` : '';
      throw new AggregateError(
        errors,
        `${errors.length} of ${promises.length} operations failed${timeoutInfo}`
      );
    }

    return results.map(r => (r as PromiseFulfilledResult<T>).value);
  }
}

/**
 * Aggregate error for allWithTimeout() when every failure was a timeout
 */
export class AggregateTimeoutError extends Error {
  constructor(public readonly errors: Error[]) {
    super(`Multiple operations timed out: ${errors.length} failures`);
    this.name = 'AggregateTimeoutError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AggregateTimeoutError);
    }
  }
}
