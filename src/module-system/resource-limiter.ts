/**
 * Production-grade resource limiting and monitoring
 * Prevents memory exhaustion and resource leaks
 */
import * as process from 'process';

export interface ResourceLimits {
  /** Maximum heap memory in bytes (default: 1GB) */
  maxMemoryBytes?: number;
  /** Maximum number of file handles (default: 1000) */
  maxFileHandles?: number;
  /** Maximum number of cached modules (default: 10000) */
  maxCachedModules?: number;
  /** Check interval in milliseconds (default: 5000) */
  checkInterval?: number;
}

export interface ResourceUsage {
  memoryUsed: number;
  memoryLimit: number;
  memoryPercent: number;
  heapUsed: number;
  heapTotal: number;
  fileHandles: number;
  cachedModules: number;
}

export type ResourceWarningCallback = (_usage: ResourceUsage, _limit: string) => void;

/**
 * Monitor and enforce resource limits to prevent exhaustion
 */
export class ResourceLimiter {
  private readonly limits: Required<ResourceLimits>;
  private checkIntervalId?: ReturnType<typeof setInterval>;
  private warningCallbacks: ResourceWarningCallback[] = [];
  private moduleCount = 0;
  private fileHandleCount = 0;

  constructor(limits: ResourceLimits = {}) {
    const defaultMaxMemory = 1024 * 1024 * 1024; // 1GB default

    this.limits = {
      maxMemoryBytes: limits.maxMemoryBytes ?? defaultMaxMemory,
      maxFileHandles: limits.maxFileHandles ?? 1000,
      maxCachedModules: limits.maxCachedModules ?? 10000,
      checkInterval: limits.checkInterval ?? 5000,
    };
  }

  /**
   * Start monitoring resources
   */
  start(): void {
    if (this.checkIntervalId) {
      return; // Already started
    }

    this.checkIntervalId = setInterval(() => {
      this.checkLimits();
    }, this.limits.checkInterval);

    // Don't prevent process exit
    if (this.checkIntervalId.unref) {
      this.checkIntervalId.unref();
    }
  }

  /**
   * Stop monitoring resources
   */
  stop(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = undefined;
    }
  }

  /**
   * Register a callback for resource warnings
   */
  onWarning(callback: ResourceWarningCallback): void {
    this.warningCallbacks.push(callback);
  }

  /**
   * Check if a module can be loaded (respects cache limit)
   */
  canLoadModule(): boolean {
    return this.moduleCount < this.limits.maxCachedModules;
  }

  /**
   * Increment module count
   */
  incrementModules(): void {
    this.moduleCount++;
  }

  /**
   * Decrement module count
   */
  decrementModules(): void {
    this.moduleCount = Math.max(0, this.moduleCount - 1);
  }

  /**
   * Set module count explicitly
   */
  setModuleCount(count: number): void {
    this.moduleCount = Math.max(0, count);
  }

  /**
   * Check if a file handle can be opened
   */
  canOpenFile(): boolean {
    return this.fileHandleCount < this.limits.maxFileHandles;
  }

  /**
   * Increment file handle count
   */
  incrementFileHandles(): void {
    this.fileHandleCount++;
  }

  /**
   * Decrement file handle count
   */
  decrementFileHandles(): void {
    this.fileHandleCount = Math.max(0, this.fileHandleCount - 1);
  }

  /**
   * Get current resource usage
   */
  getUsage(): ResourceUsage {
    const memoryUsage = process.memoryUsage();

    return {
      memoryUsed: memoryUsage.rss,
      memoryLimit: this.limits.maxMemoryBytes,
      memoryPercent: (memoryUsage.rss / this.limits.maxMemoryBytes) * 100,
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      fileHandles: this.fileHandleCount,
      cachedModules: this.moduleCount,
    };
  }

  /**
   * Check resource limits and trigger warnings
   */
  private checkLimits(): void {
    const usage = this.getUsage();

    // Check memory limit (90% threshold for warning)
    if (usage.memoryPercent > 90) {
      this.triggerWarning(usage, 'memory');
    }

    // Check file handle limit (90% threshold for warning)
    const fileHandlePercent = (usage.fileHandles / this.limits.maxFileHandles) * 100;
    if (fileHandlePercent > 90) {
      this.triggerWarning(usage, 'file_handles');
    }

    // Check cached modules limit (90% threshold for warning)
    const modulePercent = (usage.cachedModules / this.limits.maxCachedModules) * 100;
    if (modulePercent > 90) {
      this.triggerWarning(usage, 'cached_modules');
    }
  }

  /**
   * Trigger warning callbacks
   */
  private triggerWarning(usage: ResourceUsage, limit: string): void {
    for (const callback of this.warningCallbacks) {
      try {
        callback(usage, limit);
      } catch (error) {
        // Ignore callback errors to prevent cascading failures
        console.error('Resource warning callback failed:', error);
      }
    }
  }

  /**
   * Force garbage collection if available
   */
  forceGC(): void {
    if (global.gc) {
      global.gc();
    }
  }
}
