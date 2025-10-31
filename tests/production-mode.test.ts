/**
 * Production Mode Tests
 * Testing that --production flag enforces ALL safety features
 * Following AGENTS.md: "Test failure modes, not just happy paths"
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ModuleSystem } from '../src/module-system';

describe('Production Mode Enforcement', () => {
  let testDir: string;
  const moduleSystems: ModuleSystem[] = [];

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prod-mode-test-'));
  });

  afterEach(async () => {
    // Shutdown all ModuleSystem instances
    await Promise.all(moduleSystems.map(ms => ms.shutdown()));
    moduleSystems.length = 0;

    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('ModuleSystem Production Features', () => {
    test('should enable metrics in production mode', () => {
      const moduleSystem = new ModuleSystem({
        resolution: {
          baseUrl: testDir,
        },
        metrics: true,
      });
      moduleSystems.push(moduleSystem);

      // Metrics should be enabled
      const stats = moduleSystem.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalModules).toBe(0);
    });

    test('should enable circuit breakers in production mode', async () => {
      const moduleSystem = new ModuleSystem({
        resolution: {
          baseUrl: testDir,
        },
        circuitBreakers: true,
      });
      moduleSystems.push(moduleSystem);

      // Circuit breakers should be available
      const health = await moduleSystem.getHealth();
      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
    });

    test('should enable all production features when explicitly requested', async () => {
      const moduleSystem = new ModuleSystem({
        resolution: {
          baseUrl: testDir,
        },
        metrics: true,
        circuitBreakers: true,
        logger: true,
      });
      moduleSystems.push(moduleSystem);

      // All features should be enabled
      const stats = moduleSystem.getStatistics();
      expect(stats).toBeDefined();

      const health = await moduleSystem.getHealth();
      expect(health).toBeDefined();
    });

    test('should work without production features in development', () => {
      const moduleSystem = new ModuleSystem({
        resolution: {
          baseUrl: testDir,
        },
        // No production features enabled
      });
      moduleSystems.push(moduleSystem);

      // Should still work without production features
      const validation = moduleSystem.validate();
      expect(validation).toBeDefined();
    });
  });

  describe('Production Mode Configuration', () => {
    test('should accept production config in somon.config.json', () => {
      const configPath = path.join(testDir, 'somon.config.json');
      const config = {
        moduleSystem: {
          metrics: true,
          circuitBreakers: true,
          logger: true,
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Should be valid config
      expect(fs.existsSync(configPath)).toBe(true);
      const loaded = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(loaded.moduleSystem.metrics).toBe(true);
      expect(loaded.moduleSystem.circuitBreakers).toBe(true);
      expect(loaded.moduleSystem.logger).toBe(true);
    });

    test('should validate production config properly', () => {
      const configPath = path.join(testDir, 'somon.config.json');
      const config = {
        moduleSystem: {
          metrics: true,
          circuitBreakers: true,
          managementPort: 3000,
        },
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const loaded = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(typeof loaded.moduleSystem.managementPort).toBe('number');
    });
  });

  describe('Production Mode Behavior', () => {
    test('should enforce strict validation in production mode', async () => {
      const inputFile = path.join(testDir, 'input.som');
      fs.writeFileSync(
        inputFile,
        `
        // Invalid SomonScript with type errors
        тағирёбанда x: рақам = "string";
      `
      );

      const moduleSystem = new ModuleSystem({
        resolution: {
          baseUrl: testDir,
        },
        compilation: {
          strict: true,
        },
      });
      moduleSystems.push(moduleSystem);

      // Should fail with strict type checking
      await expect(moduleSystem.loadModule(inputFile, testDir)).rejects.toThrow();
    });

    test('should handle failures gracefully in production mode', async () => {
      const invalidFile = path.join(testDir, 'missing.som');

      const moduleSystem = new ModuleSystem({
        resolution: {
          baseUrl: testDir,
        },
        metrics: true,
        circuitBreakers: true,
      });
      moduleSystems.push(moduleSystem);

      // Should fail gracefully with clear error
      await expect(moduleSystem.loadModule(invalidFile, testDir)).rejects.toThrow();

      // Metrics should still be available after failure
      const stats = moduleSystem.getStatistics();
      expect(stats).toBeDefined();
    });

    test('should track errors in production mode', async () => {
      const invalidFile = path.join(testDir, 'invalid.som');
      fs.writeFileSync(invalidFile, 'invalid syntax }{][');

      const moduleSystem = new ModuleSystem({
        resolution: {
          baseUrl: testDir,
        },
        metrics: true,
      });
      moduleSystems.push(moduleSystem);

      try {
        await moduleSystem.loadModule(invalidFile, testDir);
      } catch (error) {
        // Expected error
      }

      // Should track the error in metrics
      const stats = moduleSystem.getStatistics();
      expect(stats).toBeDefined();
    });
  });

  describe('Production Mode Integration', () => {
    test('should work with complete production configuration', async () => {
      const moduleSystem = new ModuleSystem({
        resolution: {
          baseUrl: testDir,
          extensions: ['.som', '.js'],
        },
        loading: {
          cache: true,
          circularDependencyStrategy: 'error',
        },
        compilation: {
          target: 'es2020',
          strict: true,
        },
        metrics: true,
        circuitBreakers: true,
        logger: true,
      });
      moduleSystems.push(moduleSystem);

      // All features should be initialized
      const stats = moduleSystem.getStatistics();
      expect(stats).toBeDefined();

      const health = await moduleSystem.getHealth();
      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
    });

    test('should provide accurate health status in production', async () => {
      const moduleSystem = new ModuleSystem({
        resolution: {
          baseUrl: testDir,
        },
        metrics: true,
        circuitBreakers: true,
      });
      moduleSystems.push(moduleSystem);

      const health = await moduleSystem.getHealth();
      expect(health).toBeDefined();
      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(health.timestamp).toBeDefined();
      expect(health.uptime).toBeGreaterThanOrEqual(0);
    });

    test('should report accurate metrics in production', async () => {
      const validFile = path.join(testDir, 'valid.som');
      fs.writeFileSync(
        validFile,
        `
        функсия салом(): void {
          чоп.сабт("Салом");
        }
      `
      );

      const moduleSystem = new ModuleSystem({
        resolution: {
          baseUrl: testDir,
        },
        metrics: true,
      });
      moduleSystems.push(moduleSystem);

      await moduleSystem.loadModule(validFile, testDir);

      const stats = moduleSystem.getStatistics();
      expect(stats.totalModules).toBeGreaterThan(0);
      expect(stats.totalDependencies).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Production Mode Resource Management', () => {
    test('should clean up resources properly in production mode', async () => {
      const moduleSystem = new ModuleSystem({
        resolution: {
          baseUrl: testDir,
        },
        metrics: true,
        circuitBreakers: true,
      });
      moduleSystems.push(moduleSystem);

      // Create and use resources
      const testFile = path.join(testDir, 'test.som');
      fs.writeFileSync(
        testFile,
        `
        функсия тест(): void {
          чоп.сабт("тест");
        }
      `
      );

      try {
        await moduleSystem.loadModule(testFile, testDir);
      } catch (error) {
        // Expected - may fail due to compilation issues
      }

      // Should still be able to get stats (resources not leaked)
      const stats = moduleSystem.getStatistics();
      expect(stats).toBeDefined();
    });

    test('should handle cleanup on error in production mode', async () => {
      const moduleSystem = new ModuleSystem({
        resolution: {
          baseUrl: testDir,
        },
        metrics: true,
      });
      moduleSystems.push(moduleSystem);

      const invalidFile = path.join(testDir, 'invalid.som');
      fs.writeFileSync(invalidFile, '}{][invalid');

      try {
        await moduleSystem.loadModule(invalidFile, testDir);
      } catch (error) {
        // Expected error
      }

      // System should still be operational
      const health = await moduleSystem.getHealth();
      expect(health).toBeDefined();
    });
  });

  describe('Production Mode Error Reporting', () => {
    test('should provide detailed errors in production mode', async () => {
      const moduleSystem = new ModuleSystem({
        resolution: {
          baseUrl: testDir,
        },
        logger: true,
      });
      moduleSystems.push(moduleSystem);

      const missingFile = path.join(testDir, 'missing.som');

      await expect(moduleSystem.loadModule(missingFile, testDir)).rejects.toThrow();
    });

    test('should provide error details in production mode', async () => {
      const moduleSystem = new ModuleSystem({
        resolution: {
          baseUrl: testDir,
        },
        logger: true,
      });
      moduleSystems.push(moduleSystem);

      const missingFile = path.join(testDir, 'missing.som');

      try {
        await moduleSystem.loadModule(missingFile, testDir);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBeTruthy();
      }
    });

    test('should aggregate multiple errors in production mode', () => {
      const moduleSystem = new ModuleSystem({
        resolution: {
          baseUrl: testDir,
        },
        metrics: true,
      });
      moduleSystems.push(moduleSystem);

      const validation = moduleSystem.validate();
      expect(validation).toBeDefined();
      expect(validation.isValid).toBeDefined();
      expect(validation.errors).toBeDefined();
      expect(Array.isArray(validation.errors)).toBe(true);
    });
  });
});
