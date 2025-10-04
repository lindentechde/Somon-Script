/**
 * Timeout protection for async operations
 * Prevents operations from hanging indefinitely
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
    public readonly _timeout: number,
    public readonly _operation?: string
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
 * Wrap multiple promises with individual timeouts
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
      throw new AggregateTimeoutError(errors);
    }

    return results.map(r => (r as PromiseFulfilledResult<T>).value);
  }
}

/**
 * Aggregate error for multiple timeout failures
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
