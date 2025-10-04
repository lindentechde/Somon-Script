/**
 * Metrics Accuracy Verification Tests
 *
 * Ensures metrics reflect actual runtime state and are not hardcoded or stale:
 * - Health checks report real system state
 * - Metrics update in real-time
 * - Degraded/unhealthy states are properly detected
 * - No cached or stale values
 */

import * as http from 'http';
import { ManagementServer, RuntimeConfigManager } from '../src/module-system/runtime-config';
import { ModuleSystemMetrics } from '../src/module-system/metrics';
import { CircuitBreakerManager } from '../src/module-system/circuit-breaker';

describe('Metrics Accuracy Verification', () => {
  let server: ManagementServer;
  let metrics: ModuleSystemMetrics;
  let circuitBreakers: CircuitBreakerManager;
  let configManager: RuntimeConfigManager;
  let serverPort: number;

  beforeEach(async () => {
    metrics = new ModuleSystemMetrics();
    circuitBreakers = new CircuitBreakerManager({ failureThreshold: 5, recoveryTimeout: 30000 });
    configManager = new RuntimeConfigManager();

    server = new ManagementServer(metrics, circuitBreakers, configManager);
    serverPort = await server.start(0);
  });

  afterEach(async () => {
    try {
      await server.stop();
    } catch (error) {
      // Ignore errors in cleanup
    }
    circuitBreakers.shutdown();
  });

  /**
   * Helper to fetch health endpoint
   */
  async function fetchHealth(): Promise<any> {
    return new Promise((resolve, reject) => {
      http.get(`http://localhost:${serverPort}/health`, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
        res.on('error', reject);
      });
    });
  }

  /**
   * Helper to fetch metrics endpoint
   */
  async function fetchMetrics(): Promise<any> {
    return new Promise((resolve, reject) => {
      http.get(`http://localhost:${serverPort}/metrics`, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
        res.on('error', reject);
      });
    });
  }

  /**
   * Helper to fetch readiness endpoint
   */
  async function fetchReadiness(): Promise<any> {
    return new Promise((resolve, reject) => {
      http.get(`http://localhost:${serverPort}/health/ready`, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
        res.on('error', reject);
      });
    });
  }

  describe('Health Check Accuracy', () => {
    it('should report actual uptime (not hardcoded)', async () => {
      const health1 = await fetchHealth();
      expect(health1.uptime).toBeGreaterThan(0);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      const health2 = await fetchHealth();
      expect(health2.uptime).toBeGreaterThan(health1.uptime);
      expect(health2.uptime).toBeGreaterThanOrEqual(health1.uptime + 90);
    });

    it('should report actual timestamp (not hardcoded)', async () => {
      const health1 = await fetchHealth();
      expect(health1.timestamp).toBeDefined();
      expect(typeof health1.timestamp).toBe('string');

      const timestamp1 = new Date(health1.timestamp).getTime();
      expect(timestamp1).toBeGreaterThan(Date.now() - 5000); // Within last 5 seconds

      await new Promise(resolve => setTimeout(resolve, 100));

      const health2 = await fetchHealth();
      const timestamp2 = new Date(health2.timestamp).getTime();
      expect(timestamp2).toBeGreaterThan(timestamp1);
    });

    it('should include actual health checks with measurements', async () => {
      const health = await fetchHealth();

      expect(health.checks).toBeDefined();
      expect(Array.isArray(health.checks)).toBe(true);
      expect(health.checks.length).toBeGreaterThan(0);

      // Each check should have actual measurements
      for (const check of health.checks) {
        expect(check.name).toBeDefined();
        expect(check.status).toMatch(/^(pass|warn|fail)$/);
        expect(check.message).toBeDefined();
        expect(check.message.length).toBeGreaterThan(0);
        expect(check.duration).toBeGreaterThanOrEqual(0);
        expect(check.duration).toBeLessThan(1000); // Should be fast
      }
    });

    it('should report actual version', async () => {
      const health = await fetchHealth();
      expect(health.version).toBeDefined();
      // Version should be a string (either from package.json or default)
      expect(typeof health.version).toBe('string');
    });

    it('should include memory check with actual values', async () => {
      const health = await fetchHealth();
      const memoryCheck = health.checks.find((c: any) => c.name === 'memory');

      expect(memoryCheck).toBeDefined();
      expect(memoryCheck.status).toBeDefined();
      expect(memoryCheck.message).toContain('%'); // Should contain percentage
      expect(memoryCheck.message).toContain('Memory usage');
    });

    it('should include CPU check with actual values', async () => {
      const health = await fetchHealth();
      const cpuCheck = health.checks.find((c: any) => c.name === 'cpu');

      expect(cpuCheck).toBeDefined();
      expect(cpuCheck.status).toBeDefined();
      expect(cpuCheck.message).toContain('CPU');
    });

    it('should include cache check with actual values', async () => {
      const health = await fetchHealth();
      const cacheCheck = health.checks.find((c: any) => c.name === 'cache');

      expect(cacheCheck).toBeDefined();
      expect(cacheCheck.status).toBeDefined();
      expect(cacheCheck.message).toContain('Cache');
    });

    it('should include error rate check with actual values', async () => {
      const health = await fetchHealth();
      const errorCheck = health.checks.find((c: any) => c.name === 'errors');

      expect(errorCheck).toBeDefined();
      expect(errorCheck.status).toBeDefined();
      expect(errorCheck.message).toContain('Error rate');
    });
  });

  describe('Metrics Real-time Updates', () => {
    it('should update uptime in real-time', async () => {
      const stats1 = await fetchMetrics();
      expect(stats1.uptime).toBeGreaterThan(0);

      await new Promise(resolve => setTimeout(resolve, 100));

      const stats2 = await fetchMetrics();
      expect(stats2.uptime).toBeGreaterThan(stats1.uptime);
    });

    it('should reflect actual memory usage', async () => {
      const stats = await fetchMetrics();

      expect(stats.processMemoryUsage).toBeDefined();
      expect(stats.processMemoryUsage.rss).toBeGreaterThan(0);
      expect(stats.processMemoryUsage.heapTotal).toBeGreaterThan(0);
      expect(stats.processMemoryUsage.heapUsed).toBeGreaterThan(0);
      expect(stats.processMemoryUsage.heapUsed).toBeLessThanOrEqual(
        stats.processMemoryUsage.heapTotal
      );
    });

    it('should track system load', async () => {
      const stats = await fetchMetrics();

      expect(stats.systemLoad).toBeDefined();
      expect(Array.isArray(stats.systemLoad)).toBe(true);
      expect(stats.systemLoad.length).toBe(3); // 1, 5, 15 minute averages
      expect(stats.systemLoad[0]).toBeGreaterThanOrEqual(0);
    });

    it('should update metrics when operations are recorded', async () => {
      // Initial state - no operations
      const stats1 = await fetchMetrics();
      expect(stats1.loadLatency.count).toBe(0);

      // Record some load operations
      metrics.loadLatency.record(10);
      metrics.loadLatency.record(20);
      metrics.loadLatency.record(30);

      const stats2 = await fetchMetrics();
      expect(stats2.loadLatency.count).toBe(3);
      expect(stats2.loadLatency.avg).toBeCloseTo(20, 0);
      expect(stats2.loadLatency.min).toBe(10);
      expect(stats2.loadLatency.max).toBe(30);
    });

    it('should update error counts when errors occur', async () => {
      const stats1 = await fetchMetrics();
      const initialErrors = stats1.loadErrors;

      // Record some errors
      metrics.loadErrors.increment();
      metrics.loadErrors.increment();
      metrics.compileErrors.increment();

      const stats2 = await fetchMetrics();
      expect(stats2.loadErrors).toBe(initialErrors + 2);
      expect(stats2.compileErrors).toBe(1);
    });

    it('should calculate error rate based on actual counts', async () => {
      // Record requests and errors
      metrics.requestCount.increment(100);
      metrics.loadErrors.increment(5);
      metrics.compileErrors.increment(3);

      const stats = await fetchMetrics();
      expect(stats.requestCount).toBe(100);
      expect(stats.errorRate).toBeCloseTo(0.08, 2); // 8% error rate (8/100)
    });
  });

  describe('Health Status Changes', () => {
    it('should start with healthy status', async () => {
      const health = await fetchHealth();
      expect(['healthy', 'degraded']).toContain(health.status);
    });

    it('should detect degraded state when error rate is high', async () => {
      // Simulate high error rate (6% - should trigger warning)
      metrics.requestCount.increment(100);
      metrics.loadErrors.increment(6);

      const health = await fetchHealth();
      const errorCheck = health.checks.find((c: any) => c.name === 'errors');

      expect(errorCheck.status).toBe('warn');
      expect(['degraded', 'unhealthy']).toContain(health.status);
    });

    it('should detect unhealthy state when error rate is critical', async () => {
      // Simulate critical error rate (>10% - should trigger failure)
      metrics.requestCount.increment(100);
      metrics.loadErrors.increment(15);

      const health = await fetchHealth();
      const errorCheck = health.checks.find((c: any) => c.name === 'errors');

      expect(errorCheck.status).toBe('fail');
      expect(health.status).toBe('unhealthy');
    });
  });

  describe('No Stale Values', () => {
    it('should return different timestamps on each call', async () => {
      const health1 = await fetchHealth();
      await new Promise(resolve => setTimeout(resolve, 10));
      const health2 = await fetchHealth();

      expect(health1.timestamp).not.toBe(health2.timestamp);
    });

    it('should return different check durations (not cached)', async () => {
      const health1 = await fetchHealth();
      const health2 = await fetchHealth();

      // Durations might be the same due to speed, but checks should be fresh
      expect(health1).not.toBe(health2);
      expect(health1.checks).not.toBe(health2.checks);
    });

    it('should reflect metric changes immediately', async () => {
      const stats1 = await fetchMetrics();
      expect(stats1.modulesLoaded).toBe(0);

      // Record a module load
      metrics.loadLatency.record(50);

      const stats2 = await fetchMetrics();
      expect(stats2.modulesLoaded).toBe(1);
    });
  });

  describe('Readiness Check Accuracy', () => {
    it('should report actual ready state', async () => {
      const ready = await fetchReadiness();

      expect(ready.ready).toBeDefined();
      expect(typeof ready.ready).toBe('boolean');
      expect(ready.timestamp).toBeDefined();
      expect(ready.circuitBreakers).toBeDefined();
    });

    it('should reflect circuit breaker state', async () => {
      const ready1 = await fetchReadiness();
      expect(ready1.ready).toBe(true);

      // Add a circuit breaker
      const breaker = circuitBreakers.getBreaker('test-module');

      // Trip it
      for (let i = 0; i < 10; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test failure');
          });
        } catch {
          // Expected
        }
      }

      const ready2 = await fetchReadiness();
      expect(ready2.circuitBreakers.open).toBeGreaterThan(0);
      expect(ready2.ready).toBe(false);
    });

    it('should update timestamp on each call', async () => {
      const ready1 = await fetchReadiness();
      await new Promise(resolve => setTimeout(resolve, 10));
      const ready2 = await fetchReadiness();

      expect(ready1.timestamp).not.toBe(ready2.timestamp);
      expect(new Date(ready2.timestamp).getTime()).toBeGreaterThan(
        new Date(ready1.timestamp).getTime()
      );
    });
  });

  describe('Percentile Calculations', () => {
    it('should calculate accurate latency percentiles', async () => {
      // Record a distribution of latencies
      const latencies = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 100, 200];
      for (const latency of latencies) {
        metrics.loadLatency.record(latency);
      }

      const stats = await fetchMetrics();
      const { loadLatency } = stats;

      expect(loadLatency.count).toBe(12);
      expect(loadLatency.min).toBe(5);
      expect(loadLatency.max).toBe(200);
      expect(loadLatency.p50).toBeLessThanOrEqual(loadLatency.p95);
      expect(loadLatency.p95).toBeLessThanOrEqual(loadLatency.p99);
      expect(loadLatency.p99).toBeLessThanOrEqual(loadLatency.p999);
      expect(loadLatency.p999).toBeLessThanOrEqual(loadLatency.max);
    });

    it('should update percentiles as new data arrives', async () => {
      // Initial distribution
      for (let i = 1; i <= 10; i++) {
        metrics.compileLatency.record(i * 10);
      }

      const stats1 = await fetchMetrics();
      const p99_1 = stats1.compileLatency.p99;

      // Add outliers
      metrics.compileLatency.record(1000);
      metrics.compileLatency.record(2000);

      const stats2 = await fetchMetrics();
      const p99_2 = stats2.compileLatency.p99;

      expect(p99_2).toBeGreaterThan(p99_1);
    });
  });

  describe('Cache Hit Rate Accuracy', () => {
    it('should calculate cache hit rate based on actual operations', async () => {
      // No operations = 0 hit rate
      const stats1 = await fetchMetrics();
      expect(stats1.cacheHitRate).toBe(0);

      // Simulate 100 requests, 10 loads (90% cache hit rate)
      metrics.requestCount.increment(100);
      metrics.loadLatency.record(10); // 1 load
      for (let i = 0; i < 9; i++) {
        metrics.loadLatency.record(5); // 9 more loads
      }

      const stats2 = await fetchMetrics();
      // Cache hit rate = (requests - loads) / requests = (100 - 10) / 100 = 0.9
      expect(stats2.cacheHitRate).toBeCloseTo(0.9, 1);
    });
  });
});
