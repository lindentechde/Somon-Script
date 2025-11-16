/**
 * Production-grade metrics and observability system for the module system
 * Provides enterprise-level monitoring similar to Apache brpc
 */
import * as os from 'node:os';
import * as process from 'node:process';

export interface LatencyMetrics {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  p999: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  version: string;
  timestamp: number;
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  duration: number;
  timestamp: number;
}

export interface ModuleSystemStats {
  // Module metrics
  modulesLoaded: number;
  modulesInCache: number;
  cacheHitRate: number;
  cacheMemoryUsage: number;
  cacheMemoryLimit: number;

  // Performance metrics
  loadLatency: LatencyMetrics;
  compileLatency: LatencyMetrics;
  bundleLatency: LatencyMetrics;

  // Error metrics
  loadErrors: number;
  compileErrors: number;
  bundleErrors: number;
  circuitBreakerTrips: number;

  // System metrics
  processMemoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  cpuUsage: number;
  systemLoad: number[];

  // Operational metrics
  requestCount: number;
  errorRate: number;
  uptime: number;
}

/**
 * Latency recorder with percentile calculation
 */
export class LatencyRecorder {
  private measurements: number[] = [];
  private totalCount = 0;
  private totalSum = 0;
  private minValue = Number.MAX_SAFE_INTEGER;
  private maxValue = 0;
  private readonly maxSamples = 10000; // Limit memory usage

  record(latencyMs: number): void {
    this.totalCount++;
    this.totalSum += latencyMs;
    this.minValue = Math.min(this.minValue, latencyMs);
    this.maxValue = Math.max(this.maxValue, latencyMs);

    // Keep sliding window of measurements for percentiles
    this.measurements.push(latencyMs);
    if (this.measurements.length > this.maxSamples) {
      this.measurements.shift(); // Remove oldest
    }
  }

  getMetrics(): LatencyMetrics {
    if (this.totalCount === 0) {
      return {
        count: 0,
        sum: 0,
        min: 0,
        max: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        p999: 0,
      };
    }

    const sorted = [...this.measurements].sort((a, b) => a - b);

    return {
      count: this.totalCount,
      sum: this.totalSum,
      min: this.minValue,
      max: this.maxValue,
      avg: this.totalSum / this.totalCount,
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
      p999: this.percentile(sorted, 0.999),
    };
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  reset(): void {
    this.measurements = [];
    this.totalCount = 0;
    this.totalSum = 0;
    this.minValue = Number.MAX_SAFE_INTEGER;
    this.maxValue = 0;
  }
}

/**
 * Counter for tracking events and errors
 */
export class Counter {
  private count = 0;

  increment(delta = 1): void {
    this.count += delta;
  }

  getValue(): number {
    return this.count;
  }

  reset(): void {
    this.count = 0;
  }
}

/**
 * Production metrics collector and manager
 */
export class ModuleSystemMetrics {
  // Latency recorders
  public readonly loadLatency = new LatencyRecorder();
  public readonly compileLatency = new LatencyRecorder();
  public readonly bundleLatency = new LatencyRecorder();

  // Error counters
  public readonly loadErrors = new Counter();
  public readonly compileErrors = new Counter();
  public readonly bundleErrors = new Counter();
  public readonly circuitBreakerTrips = new Counter();

  // Operational counters
  public readonly requestCount = new Counter();

  private startTime = Date.now();
  private lastCpuUsage = process.cpuUsage();
  private lastCpuTime = Date.now();

  /**
   * Record the latency of an async operation
   */
  async recordAsync<T>(recorder: LatencyRecorder, operation: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await operation();
      recorder.record(Date.now() - start);
      return result;
    } catch (error) {
      recorder.record(Date.now() - start);
      throw error;
    }
  }

  /**
   * Record the latency of a sync operation
   */
  recordSync<T>(recorder: LatencyRecorder, operation: () => T): T {
    const start = Date.now();
    try {
      const result = operation();
      recorder.record(Date.now() - start);
      return result;
    } catch (error) {
      recorder.record(Date.now() - start);
      throw error;
    }
  }

  /**
   * Calculate CPU usage percentage
   */
  private calculateCpuUsage(): number {
    const currentUsage = process.cpuUsage();
    const currentTime = Date.now();

    // Handle first measurement - return reasonable default
    if (this.lastCpuTime === 0) {
      this.lastCpuUsage = currentUsage;
      this.lastCpuTime = currentTime;
      return 0; // No usage data available yet
    }

    const timeDelta = currentTime - this.lastCpuTime;
    const userDelta = currentUsage.user - this.lastCpuUsage.user;
    const systemDelta = currentUsage.system - this.lastCpuUsage.system;

    this.lastCpuUsage = currentUsage;
    this.lastCpuTime = currentTime;

    // Ensure minimum time delta to avoid division issues
    if (timeDelta < 100) {
      // Less than 100ms
      return 0; // Too small time window for accurate measurement
    }

    // Convert microseconds to percentage over time window
    const totalCpuTimeMicroseconds = userDelta + systemDelta;
    const totalCpuTimeMs = totalCpuTimeMicroseconds / 1000;
    const cpuUsagePercent = (totalCpuTimeMs / timeDelta) * 100;

    // Cap at reasonable maximum (shouldn't exceed 100% in normal cases)
    return Math.min(Math.max(cpuUsagePercent, 0), 100);
  }

  /**
   * Get comprehensive system statistics
   */
  getStats(
    cacheSize: number,
    cacheMemoryUsage: number,
    cacheMemoryLimit: number
  ): ModuleSystemStats {
    const memoryUsage = process.memoryUsage();
    const loadMetrics = this.loadLatency.getMetrics();
    const compileMetrics = this.compileLatency.getMetrics();
    const bundleMetrics = this.bundleLatency.getMetrics();

    // Calculate cache hit rate (simplified)
    const totalRequests = this.requestCount.getValue();
    const cacheHitRate =
      totalRequests > 0 ? (totalRequests - loadMetrics.count) / totalRequests : 0;

    // Calculate error rate
    const totalErrors =
      this.loadErrors.getValue() + this.compileErrors.getValue() + this.bundleErrors.getValue();
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    return {
      // Module metrics
      modulesLoaded: loadMetrics.count,
      modulesInCache: cacheSize,
      cacheHitRate: Math.max(0, Math.min(1, cacheHitRate)),
      cacheMemoryUsage,
      cacheMemoryLimit,

      // Performance metrics
      loadLatency: loadMetrics,
      compileLatency: compileMetrics,
      bundleLatency: bundleMetrics,

      // Error metrics
      loadErrors: this.loadErrors.getValue(),
      compileErrors: this.compileErrors.getValue(),
      bundleErrors: this.bundleErrors.getValue(),
      circuitBreakerTrips: this.circuitBreakerTrips.getValue(),

      // System metrics
      processMemoryUsage: memoryUsage,
      cpuUsage: this.calculateCpuUsage(),
      systemLoad: os.loadavg(),

      // Operational metrics
      requestCount: totalRequests,
      errorRate,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Perform health checks
   */
  async performHealthChecks(cacheSize: number, cacheMemoryLimit: number): Promise<SystemHealth> {
    const checks: HealthCheck[] = [];
    let overallStatus: SystemHealth['status'] = 'healthy';

    // Memory health check
    const memoryCheck = await this.checkMemoryHealth();
    checks.push(memoryCheck);
    if (memoryCheck.status === 'fail') overallStatus = 'unhealthy';
    else if (memoryCheck.status === 'warn' && overallStatus === 'healthy')
      overallStatus = 'degraded';

    // CPU health check
    const cpuCheck = await this.checkCpuHealth();
    checks.push(cpuCheck);
    if (cpuCheck.status === 'fail') overallStatus = 'unhealthy';
    else if (cpuCheck.status === 'warn' && overallStatus === 'healthy') overallStatus = 'degraded';

    // Cache health check
    const cacheCheck = this.checkCacheHealth(cacheSize, cacheMemoryLimit);
    checks.push(cacheCheck);
    if (cacheCheck.status === 'fail') overallStatus = 'unhealthy';
    else if (cacheCheck.status === 'warn' && overallStatus === 'healthy')
      overallStatus = 'degraded';

    // Error rate check
    const errorCheck = this.checkErrorRate();
    checks.push(errorCheck);
    if (errorCheck.status === 'fail') overallStatus = 'unhealthy';
    else if (errorCheck.status === 'warn' && overallStatus === 'healthy')
      overallStatus = 'degraded';

    return {
      status: overallStatus,
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '0.0.0',
      timestamp: Date.now(),
      checks,
    };
  }

  private async checkMemoryHealth(): Promise<HealthCheck> {
    const start = Date.now();
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const memoryUsagePercent = (memoryUsage.rss / totalMemory) * 100;

    let status: HealthCheck['status'] = 'pass';
    let message = `Memory usage: ${memoryUsagePercent.toFixed(1)}%`;

    if (memoryUsagePercent > 90) {
      status = 'fail';
      message = `Critical memory usage: ${memoryUsagePercent.toFixed(1)}%`;
    } else if (memoryUsagePercent > 80) {
      status = 'warn';
      message = `High memory usage: ${memoryUsagePercent.toFixed(1)}%`;
    }

    return {
      name: 'memory',
      status,
      message,
      duration: Date.now() - start,
      timestamp: Date.now(),
    };
  }

  private async checkCpuHealth(): Promise<HealthCheck> {
    const start = Date.now();
    const cpuUsage = this.calculateCpuUsage();
    const loadAvg = os.loadavg()[0]; // 1-minute load average
    const cpuCount = os.cpus().length;
    const loadPerCore = loadAvg / cpuCount;

    let status: HealthCheck['status'] = 'pass';
    let message = `CPU usage: ${cpuUsage.toFixed(1)}%, Load: ${loadAvg.toFixed(2)} (${loadPerCore.toFixed(2)}/core)`;

    // Use industry standard thresholds based on load per core and CPU usage
    // Adjusted for development systems which may have higher background load
    const isCriticalLoad = loadPerCore > 2.0; // More than 2.0x load per core
    const isCriticalCpu = cpuUsage > 90; // More than 90% CPU usage
    const isHighLoad = loadPerCore > 1.5; // More than 1.5x load per core
    const isHighCpu = cpuUsage > 80; // More than 80% CPU usage

    if (isCriticalLoad || isCriticalCpu) {
      status = 'fail';
      message = `Critical CPU: usage=${cpuUsage.toFixed(1)}%, load=${loadAvg.toFixed(2)} (${loadPerCore.toFixed(2)}/core)`;
    } else if (isHighLoad || isHighCpu) {
      status = 'warn';
      message = `High CPU: usage=${cpuUsage.toFixed(1)}%, load=${loadAvg.toFixed(2)} (${loadPerCore.toFixed(2)}/core)`;
    }

    return {
      name: 'cpu',
      status,
      message,
      duration: Date.now() - start,
      timestamp: Date.now(),
    };
  }

  private checkCacheHealth(cacheSize: number, cacheMemoryLimit: number): HealthCheck {
    const start = Date.now();
    const memoryUsage = process.memoryUsage();

    // Calculate cache utilization more accurately
    // Use heap usage relative to total system memory for a more realistic assessment
    const totalSystemMemory = os.totalmem();
    const heapUsagePercent = (memoryUsage.heapUsed / totalSystemMemory) * 100;

    // Also calculate cache limit utilization (estimated)
    const estimatedCacheUsage = cacheSize * 50000; // Rough estimate: 50KB per module
    const cacheLimitPercent =
      cacheMemoryLimit > 0 ? (estimatedCacheUsage / cacheMemoryLimit) * 100 : 0;

    let status: HealthCheck['status'] = 'pass';
    let message = `Cache: ${cacheSize} modules (~${(estimatedCacheUsage / 1024 / 1024).toFixed(1)}MB), heap: ${heapUsagePercent.toFixed(1)}%`;

    // Use more realistic thresholds based on actual cache usage estimation
    const isCritical = cacheLimitPercent > 90 || heapUsagePercent > 15; // 15% of system memory is quite high for heap
    const isHigh = cacheLimitPercent > 75 || heapUsagePercent > 10; // 10% of system memory is concerning

    if (isCritical) {
      status = 'fail';
      message = `Cache critical: ${cacheSize} modules, heap: ${heapUsagePercent.toFixed(1)}% of system memory`;
    } else if (isHigh) {
      status = 'warn';
      message = `Cache high: ${cacheSize} modules, heap: ${heapUsagePercent.toFixed(1)}% of system memory`;
    }

    return {
      name: 'cache',
      status,
      message,
      duration: Date.now() - start,
      timestamp: Date.now(),
    };
  }

  private checkErrorRate(): HealthCheck {
    const start = Date.now();
    const totalRequests = this.requestCount.getValue();
    const totalErrors =
      this.loadErrors.getValue() + this.compileErrors.getValue() + this.bundleErrors.getValue();
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    let status: HealthCheck['status'] = 'pass';
    let message = `Error rate: ${errorRate.toFixed(2)}% (${totalErrors}/${totalRequests})`;

    if (errorRate > 10) {
      status = 'fail';
      message = `Critical error rate: ${errorRate.toFixed(2)}%`;
    } else if (errorRate > 5) {
      status = 'warn';
      message = `High error rate: ${errorRate.toFixed(2)}%`;
    }

    return {
      name: 'errors',
      status,
      message,
      duration: Date.now() - start,
      timestamp: Date.now(),
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.loadLatency.reset();
    this.compileLatency.reset();
    this.bundleLatency.reset();
    this.loadErrors.reset();
    this.compileErrors.reset();
    this.bundleErrors.reset();
    this.circuitBreakerTrips.reset();
    this.requestCount.reset();
    this.startTime = Date.now();
  }
}
