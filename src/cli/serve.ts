#!/usr/bin/env node
/**
 * CLI command to start the management server for health checks and metrics
 */
import { Command } from 'commander';
import { ModuleSystem } from '../module-system';
import { loadConfig } from '../config';
import { StructuredLoggerFactory } from '../module-system/structured-logger';
import * as path from 'path';
import * as fs from 'fs';

const logger = StructuredLoggerFactory.getLogger('serve-command');

export function createServeCommand(): Command {
  const cmd = new Command('serve');

  cmd
    .description('Start the management server for health checks and metrics')
    .option('-p, --port <port>', 'Port to listen on', '8080')
    .option('-c, --config <file>', 'Path to configuration file')
    .option('--production', 'Enable production mode with all safety features')
    .option('--json', 'Use structured JSON logging')
    .action(async options => {
      try {
        // Load configuration
        const config = options.config
          ? JSON.parse(fs.readFileSync(path.resolve(options.config), 'utf8'))
          : loadConfig(process.cwd());

        const port = Number.parseInt(options.port, 10);
        const isProduction = options.production || process.env.NODE_ENV === 'production';

        // Configure structured logging if requested
        if (options.json) {
          StructuredLoggerFactory.configure({ format: 'json' });
        }

        logger.info('Starting management server', {
          port,
          production: isProduction,
          jsonLogging: options.json,
        });

        // Create module system with production features
        const moduleSystem = new ModuleSystem({
          resolution: {
            baseUrl: process.cwd(),
            ...config.moduleSystem?.resolution,
          },
          metrics: true,
          circuitBreakers: true,
          logger: true,
          managementServer: true,
          managementPort: port,
          resourceLimits: {
            maxMemoryBytes: 1024 * 1024 * 1024, // 1GB
            maxFileHandles: 1000,
            maxCachedModules: 10000,
            ...config.moduleSystem?.resourceLimits,
          },
        });

        // Start the management server
        const actualPort = await moduleSystem.startManagementServer(port);

        if (actualPort) {
          logger.info(`Management server started successfully`, {
            port: actualPort,
            endpoints: {
              health: `http://localhost:${actualPort}/health`,
              ready: `http://localhost:${actualPort}/health/ready`,
              metrics: `http://localhost:${actualPort}/metrics`,
              prometheus: `http://localhost:${actualPort}/metrics/prometheus`,
            },
          });

          // Handle graceful shutdown
          const shutdown = async () => {
            logger.info('Shutting down management server...');
            await moduleSystem.shutdown();
            process.exit(0);
          };

          process.on('SIGTERM', shutdown);
          process.on('SIGINT', shutdown);
          process.on('SIGHUP', shutdown);

          // Keep the process alive
          process.stdin.resume();
        } else {
          logger.error('Failed to start management server');
          process.exit(1);
        }
      } catch (error) {
        logger.error('Error starting management server', error as Error);
        process.exit(1);
      }
    });

  return cmd;
}
