/**
 * Prometheus metrics exporter
 */
import { ModuleSystemStats } from './metrics';
import { CircuitBreakerManager } from './circuit-breaker';

export interface PrometheusMetric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  value: number;
  labels?: Record<string, string>;
}

/**
 * Convert internal metrics to Prometheus format
 */
export class PrometheusExporter {
  private readonly prefix: string;

  constructor(prefix: string = 'somon_script') {
    this.prefix = prefix;
  }

  /**
   * Export metrics in Prometheus text format
   */
  exportMetrics(
    stats: ModuleSystemStats | null,
    circuitBreakers?: CircuitBreakerManager,
    additionalMetrics?: PrometheusMetric[]
  ): string {
    const lines: string[] = [];
    const timestamp = Date.now();

    if (stats) {
      // System info
      lines.push(`# HELP ${this.prefix}_info System information`);
      lines.push(`# TYPE ${this.prefix}_info gauge`);
      lines.push(`${this.prefix}_info{node_version="${process.version}"} 1 ${timestamp}`);

      // Uptime
      lines.push(`# HELP ${this.prefix}_uptime_seconds System uptime in seconds`);
      lines.push(`# TYPE ${this.prefix}_uptime_seconds counter`);
      lines.push(`${this.prefix}_uptime_seconds ${stats.uptime.toFixed(2)} ${timestamp}`);

      // Module metrics
      lines.push(`# HELP ${this.prefix}_modules_loaded Total number of loaded modules`);
      lines.push(`# TYPE ${this.prefix}_modules_loaded gauge`);
      lines.push(`${this.prefix}_modules_loaded ${stats.modulesLoaded} ${timestamp}`);

      lines.push(`# HELP ${this.prefix}_modules_cached Number of cached modules`);
      lines.push(`# TYPE ${this.prefix}_modules_cached gauge`);
      lines.push(`${this.prefix}_modules_cached ${stats.modulesInCache} ${timestamp}`);

      lines.push(`# HELP ${this.prefix}_cache_hit_rate Cache hit rate`);
      lines.push(`# TYPE ${this.prefix}_cache_hit_rate gauge`);
      lines.push(`${this.prefix}_cache_hit_rate ${stats.cacheHitRate} ${timestamp}`);

      // Compilation latency metrics
      lines.push(
        `# HELP ${this.prefix}_compile_latency_avg_ms Average compilation time in milliseconds`
      );
      lines.push(`# TYPE ${this.prefix}_compile_latency_avg_ms gauge`);
      lines.push(`${this.prefix}_compile_latency_avg_ms ${stats.compileLatency.avg} ${timestamp}`);

      lines.push(`# HELP ${this.prefix}_compile_latency_p99_ms 99th percentile compilation time`);
      lines.push(`# TYPE ${this.prefix}_compile_latency_p99_ms gauge`);
      lines.push(`${this.prefix}_compile_latency_p99_ms ${stats.compileLatency.p99} ${timestamp}`);

      // Error metrics
      lines.push(`# HELP ${this.prefix}_load_errors_total Total load errors`);
      lines.push(`# TYPE ${this.prefix}_load_errors_total counter`);
      lines.push(`${this.prefix}_load_errors_total ${stats.loadErrors} ${timestamp}`);

      lines.push(`# HELP ${this.prefix}_compile_errors_total Total compilation errors`);
      lines.push(`# TYPE ${this.prefix}_compile_errors_total counter`);
      lines.push(`${this.prefix}_compile_errors_total ${stats.compileErrors} ${timestamp}`);

      lines.push(`# HELP ${this.prefix}_bundle_errors_total Total bundle errors`);
      lines.push(`# TYPE ${this.prefix}_bundle_errors_total counter`);
      lines.push(`${this.prefix}_bundle_errors_total ${stats.bundleErrors} ${timestamp}`);

      // Memory metrics
      lines.push(`# HELP ${this.prefix}_memory_rss_bytes Resident set size`);
      lines.push(`# TYPE ${this.prefix}_memory_rss_bytes gauge`);
      lines.push(`${this.prefix}_memory_rss_bytes ${stats.processMemoryUsage.rss} ${timestamp}`);

      lines.push(`# HELP ${this.prefix}_memory_heap_used_bytes Heap used`);
      lines.push(`# TYPE ${this.prefix}_memory_heap_used_bytes gauge`);
      lines.push(
        `${this.prefix}_memory_heap_used_bytes ${stats.processMemoryUsage.heapUsed} ${timestamp}`
      );

      lines.push(`# HELP ${this.prefix}_memory_heap_total_bytes Heap total`);
      lines.push(`# TYPE ${this.prefix}_memory_heap_total_bytes gauge`);
      lines.push(
        `${this.prefix}_memory_heap_total_bytes ${stats.processMemoryUsage.heapTotal} ${timestamp}`
      );

      // CPU metrics
      lines.push(`# HELP ${this.prefix}_cpu_usage_percent CPU usage percentage`);
      lines.push(`# TYPE ${this.prefix}_cpu_usage_percent gauge`);
      lines.push(`${this.prefix}_cpu_usage_percent ${stats.cpuUsage} ${timestamp}`);

      // Circuit breaker trips
      lines.push(`# HELP ${this.prefix}_circuit_breaker_trips_total Total circuit breaker trips`);
      lines.push(`# TYPE ${this.prefix}_circuit_breaker_trips_total counter`);
      lines.push(
        `${this.prefix}_circuit_breaker_trips_total ${stats.circuitBreakerTrips} ${timestamp}`
      );
    }

    // Circuit breaker metrics
    if (circuitBreakers) {
      const cbStats = circuitBreakers.getAllStatus();
      const overallHealth = circuitBreakers.getOverallHealth();

      lines.push(`# HELP ${this.prefix}_circuit_breakers_total Total number of circuit breakers`);
      lines.push(`# TYPE ${this.prefix}_circuit_breakers_total gauge`);
      lines.push(
        `${this.prefix}_circuit_breakers_total ${overallHealth.totalBreakers} ${timestamp}`
      );

      lines.push(`# HELP ${this.prefix}_circuit_breakers_open Number of open circuit breakers`);
      lines.push(`# TYPE ${this.prefix}_circuit_breakers_open gauge`);
      lines.push(`${this.prefix}_circuit_breakers_open ${overallHealth.openBreakers} ${timestamp}`);

      lines.push(
        `# HELP ${this.prefix}_circuit_breakers_healthy Number of healthy circuit breakers`
      );
      lines.push(`# TYPE ${this.prefix}_circuit_breakers_healthy gauge`);
      lines.push(
        `${this.prefix}_circuit_breakers_healthy ${overallHealth.healthyBreakers} ${timestamp}`
      );

      // Individual circuit breaker metrics
      lines.push(
        `# HELP ${this.prefix}_circuit_breaker_state Circuit breaker state (0=closed, 1=open, 2=half-open)`
      );
      lines.push(`# TYPE ${this.prefix}_circuit_breaker_state gauge`);

      lines.push(`# HELP ${this.prefix}_circuit_breaker_failures Circuit breaker failure count`);
      lines.push(`# TYPE ${this.prefix}_circuit_breaker_failures counter`);

      lines.push(`# HELP ${this.prefix}_circuit_breaker_failure_rate Circuit breaker failure rate`);
      lines.push(`# TYPE ${this.prefix}_circuit_breaker_failure_rate gauge`);

      for (const [name, status] of Object.entries(cbStats)) {
        const stateValue = status.state === 'closed' ? 0 : status.state === 'open' ? 1 : 2;
        lines.push(
          `${this.prefix}_circuit_breaker_state{name="${name}"} ${stateValue} ${timestamp}`
        );
        lines.push(
          `${this.prefix}_circuit_breaker_failures{name="${name}"} ${status.failures} ${timestamp}`
        );
        lines.push(
          `${this.prefix}_circuit_breaker_failure_rate{name="${name}"} ${status.failureRate} ${timestamp}`
        );
      }
    }

    // Additional custom metrics
    if (additionalMetrics) {
      for (const metric of additionalMetrics) {
        lines.push(`# HELP ${this.prefix}_${metric.name} ${metric.help}`);
        lines.push(`# TYPE ${this.prefix}_${metric.name} ${metric.type}`);

        const labels = metric.labels
          ? '{' +
            Object.entries(metric.labels)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',') +
            '}'
          : '';

        lines.push(`${this.prefix}_${metric.name}${labels} ${metric.value} ${timestamp}`);
      }
    }

    // Add final newline
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Create histogram buckets for response times
   */
  createResponseTimeHistogram(times: number[], name: string = 'response_time'): string[] {
    const buckets = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
    const lines: string[] = [];
    const timestamp = Date.now();

    lines.push(`# HELP ${this.prefix}_${name}_ms Response time in milliseconds`);
    lines.push(`# TYPE ${this.prefix}_${name}_ms histogram`);

    for (const bucket of buckets) {
      const count = times.filter(t => t <= bucket).length;
      lines.push(`${this.prefix}_${name}_ms_bucket{le="${bucket}"} ${count} ${timestamp}`);
    }

    lines.push(`${this.prefix}_${name}_ms_bucket{le="+Inf"} ${times.length} ${timestamp}`);

    const sum = times.reduce((a, b) => a + b, 0);
    lines.push(`${this.prefix}_${name}_ms_sum ${sum} ${timestamp}`);
    lines.push(`${this.prefix}_${name}_ms_count ${times.length} ${timestamp}`);

    return lines;
  }
}
