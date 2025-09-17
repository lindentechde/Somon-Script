/**
 * Circuit breaker implementation for handling external module failures
 * Prevents cascading failures and provides graceful degradation
 */

export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening circuit
  recoveryTimeout: number; // Time to wait before attempting recovery (ms)
  monitoringPeriod: number; // Time window for failure counting (ms)
  exponentialBackoff: boolean; // Use exponential backoff for retries
  maxBackoffTime: number; // Maximum backoff time (ms)
  jitterEnabled: boolean; // Add jitter to prevent thundering herd
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureTime: number;
  nextRetryTime: number;
  consecutiveSuccesses: number;
  totalRequests: number;
  totalFailures: number;
}

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  exponential: boolean;
  jitter: boolean;
}

/**
 * Circuit breaker for external module dependencies
 */
export class CircuitBreaker {
  private state: CircuitBreakerState;
  private readonly options: Required<CircuitBreakerOptions>;
  private readonly failureTimes: number[] = [];

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      recoveryTimeout: options.recoveryTimeout ?? 30000, // 30 seconds
      monitoringPeriod: options.monitoringPeriod ?? 60000, // 1 minute
      exponentialBackoff: options.exponentialBackoff ?? true,
      maxBackoffTime: options.maxBackoffTime ?? 300000, // 5 minutes
      jitterEnabled: options.jitterEnabled ?? true,
    };

    this.state = {
      state: 'closed',
      failures: 0,
      lastFailureTime: 0,
      nextRetryTime: 0,
      consecutiveSuccesses: 0,
      totalRequests: 0,
      totalFailures: 0,
    };
  }

  /**
   * Execute an operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    this.state.totalRequests++;

    if (this.isOpen()) {
      if (fallback) {
        return fallback();
      }
      throw new Error(
        `Circuit breaker is OPEN. Next retry at ${new Date(this.state.nextRetryTime).toISOString()}`
      );
    }

    if (this.isHalfOpen()) {
      // In half-open state, allow limited requests
      return this.attemptOperation(operation, fallback);
    }

    // Closed state - normal operation
    return this.attemptOperation(operation, fallback);
  }

  /**
   * Execute with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryOptions: Partial<RetryOptions> = {},
    fallback?: () => Promise<T>
  ): Promise<T> {
    const options: RetryOptions = {
      maxRetries: retryOptions.maxRetries ?? 3,
      initialDelay: retryOptions.initialDelay ?? 1000,
      maxDelay: retryOptions.maxDelay ?? 10000,
      exponential: retryOptions.exponential ?? true,
      jitter: retryOptions.jitter ?? true,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        return await this.execute(operation, fallback);
      } catch (error) {
        lastError = error as Error;

        if (attempt === options.maxRetries) {
          break; // No more retries
        }

        // Calculate delay with exponential backoff
        let delay = options.exponential
          ? options.initialDelay * Math.pow(2, attempt)
          : options.initialDelay;

        delay = Math.min(delay, options.maxDelay);

        // Add jitter to prevent thundering herd
        if (options.jitter) {
          delay *= 0.5 + Math.random() * 0.5;
        }

        await this.sleep(delay);
      }
    }

    if (fallback) {
      return fallback();
    }

    throw lastError || new Error('All retry attempts failed');
  }

  private async attemptOperation<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();

      if (fallback && this.isOpen()) {
        return fallback();
      }

      throw error;
    }
  }

  private recordSuccess(): void {
    this.state.consecutiveSuccesses++;
    this.cleanupOldFailures();

    if (this.state.state === 'half-open') {
      // Successful request in half-open state - close the circuit
      if (this.state.consecutiveSuccesses >= 3) {
        this.state.state = 'closed';
        this.state.failures = 0;
        this.state.consecutiveSuccesses = 0;
        this.failureTimes.length = 0;
      }
    }
  }

  private recordFailure(): void {
    this.state.totalFailures++;
    this.state.failures++;
    this.state.consecutiveSuccesses = 0;
    this.state.lastFailureTime = Date.now();
    this.failureTimes.push(Date.now());

    this.cleanupOldFailures();

    // Check if we should open the circuit
    if (this.state.failures >= this.options.failureThreshold) {
      this.openCircuit();
    }
  }

  private openCircuit(): void {
    this.state.state = 'open';

    // Calculate next retry time with exponential backoff
    let backoffTime = this.options.recoveryTimeout;

    if (this.options.exponentialBackoff) {
      const failureCount = Math.min(this.state.failures - this.options.failureThreshold, 10);
      backoffTime = Math.min(
        this.options.recoveryTimeout * Math.pow(2, failureCount),
        this.options.maxBackoffTime
      );
    }

    // Add jitter to prevent thundering herd
    if (this.options.jitterEnabled) {
      backoffTime *= 0.5 + Math.random() * 0.5;
    }

    this.state.nextRetryTime = Date.now() + backoffTime;
  }

  private cleanupOldFailures(): void {
    const cutoff = Date.now() - this.options.monitoringPeriod;
    const validFailures = this.failureTimes.filter(time => time > cutoff);

    this.failureTimes.length = 0;
    this.failureTimes.push(...validFailures);
    this.state.failures = this.failureTimes.length;
  }

  private isOpen(): boolean {
    if (this.state.state !== 'open') {
      return false;
    }

    // Check if recovery timeout has passed
    if (Date.now() >= this.state.nextRetryTime) {
      this.state.state = 'half-open';
      this.state.consecutiveSuccesses = 0;
      return false;
    }

    return true;
  }

  private isHalfOpen(): boolean {
    return this.state.state === 'half-open';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    this.cleanupOldFailures();
    return { ...this.state };
  }

  /**
   * Get failure rate over the monitoring period
   */
  getFailureRate(): number {
    if (this.state.totalRequests === 0) {
      return 0;
    }
    return this.state.failures / this.state.totalRequests;
  }

  /**
   * Force circuit to closed state (for testing/admin)
   */
  reset(): void {
    this.state = {
      state: 'closed',
      failures: 0,
      lastFailureTime: 0,
      nextRetryTime: 0,
      consecutiveSuccesses: 0,
      totalRequests: this.state.totalRequests, // Keep request count
      totalFailures: this.state.totalFailures, // Keep failure count
    };
    this.failureTimes.length = 0;
  }

  /**
   * Force circuit to open state (for maintenance/emergency)
   */
  forceOpen(duration: number = this.options.recoveryTimeout): void {
    this.state.state = 'open';
    this.state.nextRetryTime = Date.now() + duration;
  }

  /**
   * Get health status of the circuit breaker
   */
  getHealthStatus(): {
    healthy: boolean;
    state: string;
    failureRate: number;
    failures: number;
    nextRetry?: string;
  } {
    const failureRate = this.getFailureRate();

    return {
      healthy: this.state.state === 'closed' && failureRate < 0.1,
      state: this.state.state,
      failureRate,
      failures: this.state.failures,
      nextRetry:
        this.state.state === 'open' ? new Date(this.state.nextRetryTime).toISOString() : undefined,
    };
  }
}

/**
 * Circuit breaker manager for multiple external dependencies
 */
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();
  private readonly defaultOptions: Partial<CircuitBreakerOptions>;

  constructor(defaultOptions: Partial<CircuitBreakerOptions> = {}) {
    this.defaultOptions = defaultOptions;
  }

  /**
   * Get or create circuit breaker for a specific external module
   */
  getBreaker(moduleId: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
    if (!this.breakers.has(moduleId)) {
      const breakerOptions = { ...this.defaultOptions, ...options };
      this.breakers.set(moduleId, new CircuitBreaker(breakerOptions));
    }
    return this.breakers.get(moduleId)!;
  }

  /**
   * Execute operation with circuit breaker protection for specific module
   */
  async execute<T>(
    moduleId: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>,
    options?: Partial<CircuitBreakerOptions>
  ): Promise<T> {
    const breaker = this.getBreaker(moduleId, options);
    return breaker.execute(operation, fallback);
  }

  /**
   * Execute with retry logic for specific module
   */
  async executeWithRetry<T>(
    moduleId: string,
    operation: () => Promise<T>,
    retryOptions?: Partial<RetryOptions>,
    fallback?: () => Promise<T>,
    breakerOptions?: Partial<CircuitBreakerOptions>
  ): Promise<T> {
    const breaker = this.getBreaker(moduleId, breakerOptions);
    return breaker.executeWithRetry(operation, retryOptions, fallback);
  }

  /**
   * Get status of all circuit breakers
   */
  getAllStatus(): Record<string, ReturnType<CircuitBreaker['getHealthStatus']>> {
    const status: Record<string, ReturnType<CircuitBreaker['getHealthStatus']>> = {};

    for (const [moduleId, breaker] of this.breakers) {
      status[moduleId] = breaker.getHealthStatus();
    }

    return status;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Force all circuit breakers to open state
   */
  forceAllOpen(duration?: number): void {
    for (const breaker of this.breakers.values()) {
      breaker.forceOpen(duration);
    }
  }

  /**
   * Remove circuit breaker for specific module
   */
  removeBreaker(moduleId: string): void {
    this.breakers.delete(moduleId);
  }

  /**
   * Get overall health status
   */
  getOverallHealth(): {
    healthy: boolean;
    totalBreakers: number;
    healthyBreakers: number;
    openBreakers: number;
  } {
    let healthyCount = 0;
    let openCount = 0;

    for (const breaker of this.breakers.values()) {
      const status = breaker.getHealthStatus();
      if (status.healthy) healthyCount++;
      if (status.state === 'open') openCount++;
    }

    return {
      healthy: openCount === 0 && healthyCount === this.breakers.size,
      totalBreakers: this.breakers.size,
      healthyBreakers: healthyCount,
      openBreakers: openCount,
    };
  }
}
