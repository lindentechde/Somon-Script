/**
 * Prometheus Metrics Exporter Unit Tests
 *
 * Tests for the Prometheus metrics exporter:
 * - Metrics export in Prometheus text format
 * - Module system statistics
 * - Circuit breaker metrics
 * - Custom metrics
 * - Histogram creation
 * - Label formatting
 */

import { PrometheusExporter, PrometheusMetric } from '../src/module-system/prometheus-metrics';
import { ModuleSystemStats } from '../src/module-system/metrics';
import { CircuitBreakerManager } from '../src/module-system/circuit-breaker';

describe('PrometheusExporter', () => {
  let exporter: PrometheusExporter;

  beforeEach(() => {
    exporter = new PrometheusExporter();
  });

  describe('Constructor and Configuration', () => {
    it('should create exporter with default prefix', () => {
      const exp = new PrometheusExporter();
      expect(exp).toBeDefined();
    });

    it('should create exporter with custom prefix', () => {
      const exp = new PrometheusExporter('custom_prefix');
      expect(exp).toBeDefined();

      const mockStats: ModuleSystemStats = createMockStats();
      const output = exp.exportMetrics(mockStats);
      expect(output).toContain('custom_prefix_info');
    });
  });

  describe('Module System Stats Export', () => {
    it('should export system info metrics', () => {
      const stats = createMockStats();
      const output = exporter.exportMetrics(stats);

      expect(output).toContain('# HELP somon_script_info System information');
      expect(output).toContain('# TYPE somon_script_info gauge');
      expect(output).toContain(`somon_script_info{node_version="${process.version}"} 1`);
    });

    it('should export uptime metric', () => {
      const stats = createMockStats({ uptime: 123.45 });
      const output = exporter.exportMetrics(stats);

      expect(output).toContain('# HELP somon_script_uptime_seconds System uptime in seconds');
      expect(output).toContain('# TYPE somon_script_uptime_seconds counter');
      expect(output).toContain('somon_script_uptime_seconds 123.45');
    });

    it('should export modules loaded metric', () => {
      const stats = createMockStats({ modulesLoaded: 42 });
      const output = exporter.exportMetrics(stats);

      expect(output).toContain('# HELP somon_script_modules_loaded Total number of loaded modules');
      expect(output).toContain('# TYPE somon_script_modules_loaded gauge');
      expect(output).toContain('somon_script_modules_loaded 42');
    });

    it('should export cached modules metric', () => {
      const stats = createMockStats({ modulesInCache: 15 });
      const output = exporter.exportMetrics(stats);

      expect(output).toContain('# HELP somon_script_modules_cached Number of cached modules');
      expect(output).toContain('# TYPE somon_script_modules_cached gauge');
      expect(output).toContain('somon_script_modules_cached 15');
    });

    it('should export cache hit rate', () => {
      const stats = createMockStats({ cacheHitRate: 0.85 });
      const output = exporter.exportMetrics(stats);

      expect(output).toContain('# HELP somon_script_cache_hit_rate Cache hit rate');
      expect(output).toContain('# TYPE somon_script_cache_hit_rate gauge');
      expect(output).toContain('somon_script_cache_hit_rate 0.85');
    });

    it('should export compilation latency metrics', () => {
      const stats = createMockStats({
        compileLatency: { avg: 12.5, p99: 45.0 },
      });
      const output = exporter.exportMetrics(stats);

      expect(output).toContain('# HELP somon_script_compile_latency_avg_ms');
      expect(output).toContain('somon_script_compile_latency_avg_ms 12.5');
      expect(output).toContain('# HELP somon_script_compile_latency_p99_ms');
      expect(output).toContain('somon_script_compile_latency_p99_ms 45');
    });

    it('should export error metrics', () => {
      const stats = createMockStats({
        loadErrors: 5,
        compileErrors: 3,
        bundleErrors: 2,
      });
      const output = exporter.exportMetrics(stats);

      expect(output).toContain('somon_script_load_errors_total 5');
      expect(output).toContain('somon_script_compile_errors_total 3');
      expect(output).toContain('somon_script_bundle_errors_total 2');
    });

    it('should export memory metrics', () => {
      const stats = createMockStats({
        processMemoryUsage: {
          rss: 1024000,
          heapUsed: 512000,
          heapTotal: 768000,
          external: 0,
          arrayBuffers: 0,
        },
      });
      const output = exporter.exportMetrics(stats);

      expect(output).toContain('somon_script_memory_rss_bytes 1024000');
      expect(output).toContain('somon_script_memory_heap_used_bytes 512000');
      expect(output).toContain('somon_script_memory_heap_total_bytes 768000');
    });

    it('should export CPU usage metric', () => {
      const stats = createMockStats({ cpuUsage: 45.5 });
      const output = exporter.exportMetrics(stats);

      expect(output).toContain('# HELP somon_script_cpu_usage_percent CPU usage percentage');
      expect(output).toContain('somon_script_cpu_usage_percent 45.5');
    });

    it('should export circuit breaker trips metric', () => {
      const stats = createMockStats({ circuitBreakerTrips: 7 });
      const output = exporter.exportMetrics(stats);

      expect(output).toContain('# HELP somon_script_circuit_breaker_trips_total');
      expect(output).toContain('somon_script_circuit_breaker_trips_total 7');
    });
  });

  describe('Circuit Breaker Metrics Export', () => {
    it('should export circuit breaker metrics when provided', () => {
      const stats = createMockStats();
      const cbManager = createMockCircuitBreakerManager();
      const output = exporter.exportMetrics(stats, cbManager);

      expect(output).toContain('# HELP somon_script_circuit_breakers_total');
      expect(output).toContain('somon_script_circuit_breakers_total 2');
    });

    it('should export circuit breaker open count', () => {
      const stats = createMockStats();
      const cbManager = createMockCircuitBreakerManager({
        openBreakers: 1,
      });
      const output = exporter.exportMetrics(stats, cbManager);

      expect(output).toContain('# HELP somon_script_circuit_breakers_open');
      expect(output).toContain('somon_script_circuit_breakers_open 1');
    });

    it('should export healthy circuit breakers count', () => {
      const stats = createMockStats();
      const cbManager = createMockCircuitBreakerManager({
        healthyBreakers: 1,
      });
      const output = exporter.exportMetrics(stats, cbManager);

      expect(output).toContain('# HELP somon_script_circuit_breakers_healthy');
      expect(output).toContain('somon_script_circuit_breakers_healthy 1');
    });

    it('should export individual circuit breaker states', () => {
      const stats = createMockStats();
      const cbManager = createMockCircuitBreakerManager();
      const output = exporter.exportMetrics(stats, cbManager);

      expect(output).toContain('somon_script_circuit_breaker_state{name="breaker1"} 0');
      expect(output).toContain('somon_script_circuit_breaker_state{name="breaker2"} 1');
    });

    it('should export circuit breaker failures', () => {
      const stats = createMockStats();
      const cbManager = createMockCircuitBreakerManager();
      const output = exporter.exportMetrics(stats, cbManager);

      expect(output).toContain('somon_script_circuit_breaker_failures{name="breaker1"} 0');
      expect(output).toContain('somon_script_circuit_breaker_failures{name="breaker2"} 5');
    });

    it('should export circuit breaker failure rates', () => {
      const stats = createMockStats();
      const cbManager = createMockCircuitBreakerManager();
      const output = exporter.exportMetrics(stats, cbManager);

      expect(output).toContain('somon_script_circuit_breaker_failure_rate{name="breaker1"} 0');
      expect(output).toContain('somon_script_circuit_breaker_failure_rate{name="breaker2"} 0.5');
    });

    it('should handle half-open circuit breaker state', () => {
      const stats = createMockStats();
      const cbManager = createMockCircuitBreakerManager({
        statuses: {
          'breaker-half-open': {
            state: 'half-open',
            failures: 2,
            failureRate: 0.2,
            nextRetry: Date.now(),
          },
        },
      });
      const output = exporter.exportMetrics(stats, cbManager);

      expect(output).toContain('somon_script_circuit_breaker_state{name="breaker-half-open"} 2');
    });
  });

  describe('Additional Custom Metrics', () => {
    it('should export additional metrics when provided', () => {
      const stats = createMockStats();
      const additionalMetrics: PrometheusMetric[] = [
        {
          name: 'custom_counter',
          help: 'A custom counter metric',
          type: 'counter',
          value: 123,
        },
      ];

      const output = exporter.exportMetrics(stats, undefined, additionalMetrics);

      expect(output).toContain('# HELP somon_script_custom_counter A custom counter metric');
      expect(output).toContain('# TYPE somon_script_custom_counter counter');
      expect(output).toContain('somon_script_custom_counter 123');
    });

    it('should export metrics with labels', () => {
      const stats = createMockStats();
      const additionalMetrics: PrometheusMetric[] = [
        {
          name: 'request_count',
          help: 'Request count by method',
          type: 'counter',
          value: 456,
          labels: { method: 'GET', status: '200' },
        },
      ];

      const output = exporter.exportMetrics(stats, undefined, additionalMetrics);

      expect(output).toContain('somon_script_request_count{method="GET",status="200"} 456');
    });

    it('should export multiple additional metrics', () => {
      const stats = createMockStats();
      const additionalMetrics: PrometheusMetric[] = [
        {
          name: 'metric1',
          help: 'First metric',
          type: 'gauge',
          value: 100,
        },
        {
          name: 'metric2',
          help: 'Second metric',
          type: 'counter',
          value: 200,
        },
      ];

      const output = exporter.exportMetrics(stats, undefined, additionalMetrics);

      expect(output).toContain('somon_script_metric1 100');
      expect(output).toContain('somon_script_metric2 200');
    });

    it('should handle different metric types', () => {
      const stats = createMockStats();
      const additionalMetrics: PrometheusMetric[] = [
        {
          name: 'gauge_metric',
          help: 'A gauge',
          type: 'gauge',
          value: 1.5,
        },
        {
          name: 'counter_metric',
          help: 'A counter',
          type: 'counter',
          value: 42,
        },
        {
          name: 'histogram_metric',
          help: 'A histogram',
          type: 'histogram',
          value: 10,
        },
        {
          name: 'summary_metric',
          help: 'A summary',
          type: 'summary',
          value: 20,
        },
      ];

      const output = exporter.exportMetrics(stats, undefined, additionalMetrics);

      expect(output).toContain('# TYPE somon_script_gauge_metric gauge');
      expect(output).toContain('# TYPE somon_script_counter_metric counter');
      expect(output).toContain('# TYPE somon_script_histogram_metric histogram');
      expect(output).toContain('# TYPE somon_script_summary_metric summary');
    });
  });

  describe('Response Time Histogram', () => {
    it('should create histogram buckets', () => {
      const times = [5, 15, 35, 75, 150, 350, 750, 1500, 3500, 7500];
      const lines = exporter.createResponseTimeHistogram(times);

      expect(lines.length).toBeGreaterThan(0);
      expect(lines.join('\n')).toContain('# HELP somon_script_response_time_ms');
      expect(lines.join('\n')).toContain('# TYPE somon_script_response_time_ms histogram');
    });

    it('should create buckets with correct counts', () => {
      const times = [5, 15, 35, 75, 150];
      const lines = exporter.createResponseTimeHistogram(times);
      const output = lines.join('\n');

      // Check that buckets contain cumulative counts
      expect(output).toContain('le="10"');
      expect(output).toContain('le="25"');
      expect(output).toContain('le="50"');
      expect(output).toContain('le="100"');
      expect(output).toContain('le="+Inf"');
    });

    it('should include sum and count', () => {
      const times = [10, 20, 30];
      const lines = exporter.createResponseTimeHistogram(times);
      const output = lines.join('\n');

      expect(output).toContain('_sum 60'); // 10 + 20 + 30
      expect(output).toContain('_count 3');
    });

    it('should handle empty times array', () => {
      const times: number[] = [];
      const lines = exporter.createResponseTimeHistogram(times);
      const output = lines.join('\n');

      expect(output).toContain('_sum 0');
      expect(output).toContain('_count 0');
    });

    it('should handle single value', () => {
      const times = [100];
      const lines = exporter.createResponseTimeHistogram(times);
      const output = lines.join('\n');

      expect(output).toContain('_sum 100');
      expect(output).toContain('_count 1');
    });

    it('should support custom histogram name', () => {
      const times = [10, 20, 30];
      const lines = exporter.createResponseTimeHistogram(times, 'custom_latency');
      const output = lines.join('\n');

      expect(output).toContain('# HELP somon_script_custom_latency_ms');
      expect(output).toContain('# TYPE somon_script_custom_latency_ms histogram');
    });

    it('should handle large values', () => {
      const times = [15000, 20000, 25000];
      const lines = exporter.createResponseTimeHistogram(times);
      const output = lines.join('\n');

      expect(output).toContain('le="+Inf"} 3');
      expect(output).toContain('_sum 60000');
    });

    it('should correctly count values in buckets', () => {
      const times = [5, 15, 25, 55, 105]; // 5 values
      const lines = exporter.createResponseTimeHistogram(times);
      const output = lines.join('\n');

      // Values <= 10: 1 (5)
      // Values <= 25: 3 (5, 15, 25)
      // Values <= 50: 3 (5, 15, 25)
      // Values <= 100: 4 (5, 15, 25, 55)
      // Values <= +Inf: 5 (all)

      expect(output).toMatch(/le="10"}\s+1/);
      expect(output).toMatch(/le="25"}\s+3/);
      expect(output).toMatch(/le="50"}\s+3/);
      expect(output).toMatch(/le="100"}\s+4/);
      expect(output).toMatch(/le="\+Inf"}\s+5/);
    });
  });

  describe('Null and Empty Handling', () => {
    it('should handle null stats', () => {
      const output = exporter.exportMetrics(null);

      expect(output).toBeDefined();
      // With no stats, circuit breakers, or additional metrics, only final newline
      expect(output.trim()).toBe('');
    });

    it('should handle null stats with circuit breakers', () => {
      const cbManager = createMockCircuitBreakerManager();
      const output = exporter.exportMetrics(null, cbManager);

      expect(output).toBeDefined();
      expect(output).toContain('somon_script_circuit_breakers_total');
    });

    it('should handle null stats with additional metrics', () => {
      const additionalMetrics: PrometheusMetric[] = [
        {
          name: 'custom_metric',
          help: 'Custom',
          type: 'gauge',
          value: 100,
        },
      ];
      const output = exporter.exportMetrics(null, undefined, additionalMetrics);

      expect(output).toBeDefined();
      expect(output).toContain('somon_script_custom_metric');
    });

    it('should end with newline', () => {
      const stats = createMockStats();
      const output = exporter.exportMetrics(stats);

      expect(output.endsWith('\n')).toBe(true);
    });
  });

  describe('Prometheus Format Compliance', () => {
    it('should include timestamps in metrics', () => {
      const stats = createMockStats();
      const output = exporter.exportMetrics(stats);

      // Check that metrics have timestamps (numbers at the end)
      const lines = output.split('\n').filter(line => !line.startsWith('#') && line.trim());
      for (const line of lines) {
        expect(line).toMatch(/\s+\d+(\.\d+)?\s+\d+$/); // value and timestamp
      }
    });

    it('should format labels correctly', () => {
      const stats = createMockStats();
      const additionalMetrics: PrometheusMetric[] = [
        {
          name: 'test_metric',
          help: 'Test',
          type: 'gauge',
          value: 1,
          labels: { key1: 'value1', key2: 'value2' },
        },
      ];

      const output = exporter.exportMetrics(stats, undefined, additionalMetrics);

      expect(output).toMatch(/test_metric\{key1="value1",key2="value2"\}/);
    });

    it('should escape quotes in node version', () => {
      const stats = createMockStats();
      const output = exporter.exportMetrics(stats);

      // Node version should be quoted properly
      expect(output).toContain(`node_version="${process.version}"`);
    });
  });
});

// Helper functions

function createMockStats(overrides: Partial<ModuleSystemStats> = {}): ModuleSystemStats {
  return {
    uptime: 100,
    modulesLoaded: 10,
    modulesInCache: 5,
    cacheHitRate: 0.5,
    compileLatency: { avg: 10, p99: 50 },
    loadErrors: 0,
    compileErrors: 0,
    bundleErrors: 0,
    processMemoryUsage: {
      rss: 1024000,
      heapUsed: 512000,
      heapTotal: 768000,
      external: 0,
      arrayBuffers: 0,
    },
    cpuUsage: 10,
    circuitBreakerTrips: 0,
    ...overrides,
  };
}

function createMockCircuitBreakerManager(
  overrides: {
    totalBreakers?: number;
    openBreakers?: number;
    healthyBreakers?: number;
    statuses?: Record<string, any>;
  } = {}
): CircuitBreakerManager {
  const defaultStatuses = {
    breaker1: {
      state: 'closed' as const,
      failures: 0,
      failureRate: 0,
      nextRetry: undefined,
    },
    breaker2: {
      state: 'open' as const,
      failures: 5,
      failureRate: 0.5,
      nextRetry: Date.now() + 5000,
    },
  };

  return {
    getAllStatus: () => overrides.statuses || defaultStatuses,
    getOverallHealth: () => ({
      totalBreakers: overrides.totalBreakers ?? 2,
      openBreakers: overrides.openBreakers ?? 1,
      healthyBreakers: overrides.healthyBreakers ?? 1,
      isHealthy: (overrides.openBreakers ?? 1) === 0,
    }),
  } as any as CircuitBreakerManager;
}
