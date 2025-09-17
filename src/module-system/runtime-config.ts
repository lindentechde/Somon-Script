/**
 * Runtime configuration and health check system
 * Provides dynamic configuration updates and HTTP management endpoints
 */
import * as http from 'http';
import * as url from 'url';
import { ModuleSystemMetrics } from './metrics';
import { CircuitBreakerManager } from './circuit-breaker';
import { LoggerFactory, LogLevel } from './logger';

export interface RuntimeConfig {
  // Module system configuration
  maxCacheSize: number;
  maxCacheMemory: number;
  circularDependencyStrategy: 'error' | 'warn' | 'ignore';

  // Performance tuning
  enableTracing: boolean;
  logLevel: LogLevel;
  enableMetrics: boolean;

  // Circuit breaker configuration
  circuitBreakerEnabled: boolean;
  failureThreshold: number;
  recoveryTimeout: number;

  // Health check configuration
  healthCheckInterval: number;
  enableHealthEndpoint: boolean;
  enableMetricsEndpoint: boolean;
  managementPort: number;
}

export interface HealthEndpointResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    duration: number;
  }[];
  details?: {
    circuitBreakers?: Record<string, unknown>;
    cache?: {
      size: number;
      memoryUsage: number;
      hitRate: number;
    };
  };
}

/**
 * Dynamic configuration manager
 */
export class RuntimeConfigManager {
  private config: RuntimeConfig;
  private readonly configChangeCallbacks = new Map<
    string,
    (_newValue: unknown, _oldValue: unknown) => void
  >();

  constructor(initialConfig: Partial<RuntimeConfig> = {}) {
    this.config = {
      // Default configuration
      maxCacheSize: 1000,
      maxCacheMemory: 100 * 1024 * 1024, // 100MB
      circularDependencyStrategy: 'warn',
      enableTracing: true,
      logLevel: 'info',
      enableMetrics: true,
      circuitBreakerEnabled: true,
      failureThreshold: 5,
      recoveryTimeout: 30000,
      healthCheckInterval: 30000,
      enableHealthEndpoint: true,
      enableMetricsEndpoint: true,
      managementPort: 0, // 0 = disabled
      ...initialConfig,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): RuntimeConfig {
    return { ...this.config };
  }

  /**
   * Update a configuration value
   */
  updateConfig<K extends keyof RuntimeConfig>(key: K, value: RuntimeConfig[K]): void {
    const oldValue = this.config[key];
    this.config[key] = value;

    // Trigger callbacks
    const callback = this.configChangeCallbacks.get(key);
    if (callback) {
      callback(value, oldValue);
    }

    LoggerFactory.getLogger('runtime-config').info('Configuration updated', {
      key,
      oldValue,
      newValue: value,
    });
  }

  /**
   * Update multiple configuration values
   */
  updateMultiple(updates: Partial<RuntimeConfig>): void {
    for (const [key, value] of Object.entries(updates)) {
      this.updateConfig(key as keyof RuntimeConfig, value);
    }
  }

  /**
   * Register callback for configuration changes
   */
  onConfigChange<K extends keyof RuntimeConfig>(
    key: K,
    callback: (_newValue: RuntimeConfig[K], _oldValue: RuntimeConfig[K]) => void
  ): void {
    this.configChangeCallbacks.set(
      key,
      callback as (_newValue: unknown, _oldValue: unknown) => void
    );
  }

  /**
   * Validate configuration values
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.maxCacheSize <= 0) {
      errors.push('maxCacheSize must be greater than 0');
    }

    if (this.config.maxCacheMemory <= 0) {
      errors.push('maxCacheMemory must be greater than 0');
    }

    if (this.config.failureThreshold <= 0) {
      errors.push('failureThreshold must be greater than 0');
    }

    if (this.config.recoveryTimeout <= 0) {
      errors.push('recoveryTimeout must be greater than 0');
    }

    if (this.config.healthCheckInterval <= 0) {
      errors.push('healthCheckInterval must be greater than 0');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    const defaults = new RuntimeConfigManager().getConfig();
    for (const [key, value] of Object.entries(defaults)) {
      this.updateConfig(key as keyof RuntimeConfig, value);
    }
  }
}

/**
 * HTTP management server for health checks and metrics
 */
export class ManagementServer {
  private server?: http.Server;
  private readonly metrics: ModuleSystemMetrics;
  private readonly circuitBreakers: CircuitBreakerManager;
  private readonly configManager: RuntimeConfigManager;
  private readonly logger = LoggerFactory.getLogger('management-server');

  constructor(
    metrics: ModuleSystemMetrics,
    circuitBreakers: CircuitBreakerManager,
    configManager: RuntimeConfigManager
  ) {
    this.metrics = metrics;
    this.circuitBreakers = circuitBreakers;
    this.configManager = configManager;
  }

  /**
   * Start the management server
   */
  start(port: number): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(this.handleRequest.bind(this));

      this.server.on('error', error => {
        this.logger.error('Management server error', error);
        reject(error);
      });

      this.server.listen(port, () => {
        const address = this.server!.address();
        const actualPort = typeof address === 'object' && address ? address.port : port;

        this.logger.info('Management server started', { port: actualPort });
        resolve(actualPort);
      });
    });
  }

  /**
   * Stop the management server
   */
  stop(): Promise<void> {
    return new Promise(resolve => {
      if (this.server) {
        this.server.close(() => {
          this.logger.info('Management server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const parsedUrl = url.parse(req.url || '', true);
    const pathname = parsedUrl.pathname || '';
    const method = req.method || 'GET';

    this.logger.debug('Management request', { method, pathname });

    try {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      switch (pathname) {
        case '/health':
          await this.handleHealthCheck(req, res);
          break;
        case '/health/ready':
          await this.handleReadinessCheck(req, res);
          break;
        case '/metrics':
          await this.handleMetrics(req, res);
          break;
        case '/config':
          await this.handleConfig(req, res);
          break;
        case '/circuit-breakers':
          await this.handleCircuitBreakers(req, res);
          break;
        case '/admin/reset':
          await this.handleReset(req, res);
          break;
        default:
          await this.handleNotFound(req, res);
      }
    } catch (error) {
      this.logger.error('Request handling error', error as Error);
      this.sendErrorResponse(res, 500, 'Internal Server Error');
    }
  }

  private async handleHealthCheck(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const config = this.configManager.getConfig();
    const health = await this.metrics.performHealthChecks(0, config.maxCacheMemory);

    const response: HealthEndpointResponse = {
      status: health.status,
      timestamp: new Date().toISOString(),
      uptime: health.uptime,
      version: health.version,
      checks: health.checks.map(check => ({
        name: check.name,
        status: check.status,
        message: check.message,
        duration: check.duration,
      })),
      details: {
        circuitBreakers: this.circuitBreakers.getAllStatus(),
      },
    };

    let statusCode: number;
    if (health.status === 'healthy' || health.status === 'degraded') {
      statusCode = 200;
    } else {
      statusCode = 503;
    }

    this.sendJsonResponse(res, statusCode, response);
  }

  private async handleReadinessCheck(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    // Readiness check - simplified version of health check
    const overallHealth = this.circuitBreakers.getOverallHealth();
    const ready = overallHealth.healthy;

    const response = {
      ready,
      timestamp: new Date().toISOString(),
      circuitBreakers: {
        total: overallHealth.totalBreakers,
        healthy: overallHealth.healthyBreakers,
        open: overallHealth.openBreakers,
      },
    };

    this.sendJsonResponse(res, ready ? 200 : 503, response);
  }

  private async handleMetrics(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const config = this.configManager.getConfig();
    const stats = this.metrics.getStats(0, 0, config.maxCacheMemory);

    this.sendJsonResponse(res, 200, stats);
  }

  private async handleConfig(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const method = req.method || 'GET';

    if (method === 'GET') {
      const config = this.configManager.getConfig();
      this.sendJsonResponse(res, 200, config);
    } else if (method === 'PUT' || method === 'POST') {
      const body = await this.readRequestBody(req);

      try {
        const updates = JSON.parse(body);
        this.configManager.updateMultiple(updates);

        const validation = this.configManager.validateConfig();
        if (!validation.valid) {
          this.sendJsonResponse(res, 400, {
            error: 'Invalid configuration',
            details: validation.errors,
          });
          return;
        }

        this.sendJsonResponse(res, 200, {
          message: 'Configuration updated',
          config: this.configManager.getConfig(),
        });
      } catch (error) {
        this.sendJsonResponse(res, 400, {
          error: 'Invalid JSON',
          message: (error as Error).message,
        });
      }
    } else {
      this.sendErrorResponse(res, 405, 'Method Not Allowed');
    }
  }

  private async handleCircuitBreakers(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const method = req.method || 'GET';

    if (method === 'GET') {
      const status = this.circuitBreakers.getAllStatus();
      const overall = this.circuitBreakers.getOverallHealth();

      this.sendJsonResponse(res, 200, {
        overall,
        breakers: status,
      });
    } else if (method === 'POST') {
      const body = await this.readRequestBody(req);

      try {
        const action = JSON.parse(body);

        if (action.type === 'reset') {
          if (action.moduleId) {
            const breaker = this.circuitBreakers.getBreaker(action.moduleId);
            breaker.reset();
          } else {
            this.circuitBreakers.resetAll();
          }

          this.sendJsonResponse(res, 200, { message: 'Circuit breakers reset' });
        } else {
          this.sendJsonResponse(res, 400, { error: 'Unknown action type' });
        }
      } catch (error) {
        this.sendJsonResponse(res, 400, {
          error: 'Invalid JSON',
          message: (error as Error).message,
        });
      }
    } else {
      this.sendErrorResponse(res, 405, 'Method Not Allowed');
    }
  }

  private async handleReset(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (req.method !== 'POST') {
      this.sendErrorResponse(res, 405, 'Method Not Allowed');
      return;
    }

    // Reset all systems
    this.metrics.reset();
    this.circuitBreakers.resetAll();

    this.sendJsonResponse(res, 200, {
      message: 'All systems reset',
      timestamp: new Date().toISOString(),
    });
  }

  private async handleNotFound(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    this.sendErrorResponse(res, 404, 'Not Found');
  }

  private sendJsonResponse(res: http.ServerResponse, statusCode: number, data: unknown): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }

  private sendErrorResponse(res: http.ServerResponse, statusCode: number, message: string): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: message, timestamp: new Date().toISOString() }));
  }

  private readRequestBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve(body);
      });
      req.on('error', reject);
    });
  }
}
