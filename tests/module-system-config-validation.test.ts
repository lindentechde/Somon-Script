import { ModuleSystem } from '../src/module-system/module-system';
import * as path from 'path';

describe('ModuleSystem Configuration Validation', () => {
  const validBaseConfig = {
    resolution: {
      baseUrl: path.resolve(__dirname, '..'),
    },
  };

  describe('Management Server Dependencies', () => {
    it('should reject managementServer without metrics', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          managementServer: true,
          circuitBreakers: true,
          // metrics missing
        });
      }).toThrow(/managementServer requires metrics to be enabled/);
    });

    it('should reject managementServer without circuitBreakers', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          managementServer: true,
          metrics: true,
          // circuitBreakers missing
        });
      }).toThrow(/managementServer requires circuitBreakers to be enabled/);
    });

    it('should reject managementServer without both metrics and circuitBreakers', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          managementServer: true,
        });
      }).toThrow(/configuration validation failed/);
    });

    it('should accept managementServer with both metrics and circuitBreakers', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          managementServer: true,
          metrics: true,
          circuitBreakers: true,
        });
      }).not.toThrow();
    });
  });

  describe('Management Port Validation', () => {
    it('should reject port below valid range', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          managementPort: 0,
        });
      }).toThrow(/managementPort must be an integer between 1 and 65535/);
    });

    it('should reject port above valid range', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          managementPort: 65536,
        });
      }).toThrow(/managementPort must be an integer between 1 and 65535/);
    });

    it('should reject non-integer port', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          managementPort: 3000.5,
        });
      }).toThrow(/managementPort must be an integer between 1 and 65535/);
    });

    it('should accept valid port range', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          managementPort: 3000,
        });
      }).not.toThrow();

      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          managementPort: 1,
        });
      }).not.toThrow();

      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          managementPort: 65535,
        });
      }).not.toThrow();
    });
  });

  describe('Operation Timeout Validation', () => {
    it('should reject timeout below minimum', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          operationTimeout: 999,
        });
      }).toThrow(/operationTimeout must be between 1000ms \(1s\) and 600000ms \(10min\)/);
    });

    it('should reject timeout above maximum', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          operationTimeout: 600001,
        });
      }).toThrow(/operationTimeout must be between 1000ms \(1s\) and 600000ms \(10min\)/);
    });

    it('should reject non-integer timeout', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          operationTimeout: 5000.5,
        });
      }).toThrow(/operationTimeout must be between 1000ms \(1s\) and 600000ms \(10min\)/);
    });

    it('should accept valid timeout range', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          operationTimeout: 1000,
        });
      }).not.toThrow();

      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          operationTimeout: 120000,
        });
      }).not.toThrow();

      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          operationTimeout: 600000,
        });
      }).not.toThrow();
    });
  });

  describe('Resource Limits Validation', () => {
    it('should reject maxMemoryBytes below 1MB', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          resourceLimits: {
            maxMemoryBytes: 1024 * 1024 - 1,
          },
        });
      }).toThrow(/resourceLimits.maxMemoryBytes must be at least 1MB/);
    });

    it('should reject negative maxFileHandles', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          resourceLimits: {
            maxFileHandles: 0,
          },
        });
      }).toThrow(/resourceLimits.maxFileHandles must be a positive integer/);
    });

    it('should reject negative maxCachedModules', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          resourceLimits: {
            maxCachedModules: 0,
          },
        });
      }).toThrow(/resourceLimits.maxCachedModules must be a positive integer/);
    });

    it('should reject checkInterval below minimum', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          resourceLimits: {
            checkInterval: 99,
          },
        });
      }).toThrow(/resourceLimits.checkInterval must be between 100ms and 60000ms/);
    });

    it('should reject checkInterval above maximum', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          resourceLimits: {
            checkInterval: 60001,
          },
        });
      }).toThrow(/resourceLimits.checkInterval must be between 100ms and 60000ms/);
    });

    it('should accept valid resource limits', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          resourceLimits: {
            maxMemoryBytes: 100 * 1024 * 1024, // 100MB
            maxFileHandles: 100,
            maxCachedModules: 1000,
            checkInterval: 5000,
          },
        });
      }).not.toThrow();
    });
  });

  describe('Loader Options Validation', () => {
    it('should reject invalid circularDependencyStrategy', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          loading: {
            circularDependencyStrategy: 'invalid' as any,
          },
        });
      }).toThrow(/loading.circularDependencyStrategy must be one of: error, warn, ignore/);
    });

    it('should reject invalid maxCacheSize', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          loading: {
            maxCacheSize: 0,
          },
        });
      }).toThrow(/loading.maxCacheSize must be a positive integer/);
    });

    it('should reject maxCacheMemory below minimum', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          loading: {
            maxCacheMemory: 1023,
          },
        });
      }).toThrow(/loading.maxCacheMemory must be at least 1KB/);
    });

    it('should reject invalid encoding', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          loading: {
            encoding: 'invalid-encoding' as any,
          },
        });
      }).toThrow(/loading.encoding must be a valid encoding/);
    });

    it('should accept valid loader options', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          loading: {
            circularDependencyStrategy: 'error',
            maxCacheSize: 1000,
            maxCacheMemory: 100 * 1024 * 1024,
            encoding: 'utf-8',
          },
        });
      }).not.toThrow();
    });

    it('should accept all valid circular dependency strategies', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          loading: { circularDependencyStrategy: 'error' },
        });
      }).not.toThrow();

      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          loading: { circularDependencyStrategy: 'warn' },
        });
      }).not.toThrow();

      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          loading: { circularDependencyStrategy: 'ignore' },
        });
      }).not.toThrow();
    });

    it('should accept all valid encodings', () => {
      const validEncodings = [
        'ascii',
        'utf8',
        'utf-8',
        'utf16le',
        'ucs2',
        'ucs-2',
        'base64',
        'base64url',
        'latin1',
        'binary',
        'hex',
      ];

      for (const encoding of validEncodings) {
        expect(() => {
          new ModuleSystem({
            ...validBaseConfig,
            loading: { encoding: encoding as any },
          });
        }).not.toThrow();
      }
    });
  });

  describe('Error Aggregation', () => {
    it('should report multiple validation errors together', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          managementServer: true,
          // Missing metrics and circuitBreakers
          managementPort: 0, // Invalid port
          operationTimeout: 500, // Too low
          resourceLimits: {
            maxMemoryBytes: 100, // Too low
          },
          loading: {
            circularDependencyStrategy: 'invalid' as any,
          },
        });
      }).toThrow(/configuration validation failed/);
    });

    it('should include all errors in error message', () => {
      try {
        new ModuleSystem({
          ...validBaseConfig,
          managementServer: true,
          managementPort: 0,
        });
        expect.fail('Should have thrown');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('managementServer requires metrics');
        expect(message).toContain('managementServer requires circuitBreakers');
        expect(message).toContain('managementPort must be an integer between 1 and 65535');
      }
    });
  });

  describe('Valid Configurations', () => {
    it('should accept minimal valid configuration', () => {
      expect(() => {
        new ModuleSystem({
          resolution: {
            baseUrl: path.resolve(__dirname, '..'),
          },
        });
      }).not.toThrow();
    });

    it('should accept full production configuration', () => {
      expect(() => {
        new ModuleSystem({
          resolution: {
            baseUrl: path.resolve(__dirname, '..'),
            extensions: ['.som', '.js'],
            moduleDirectories: ['node_modules'],
          },
          loading: {
            encoding: 'utf-8',
            cache: true,
            circularDependencyStrategy: 'warn',
            maxCacheSize: 1000,
            maxCacheMemory: 100 * 1024 * 1024,
          },
          compilation: {
            target: 'es2020',
            sourceMap: true,
          },
          metrics: true,
          circuitBreakers: true,
          logger: true,
          managementServer: true,
          managementPort: 3000,
          resourceLimits: {
            maxMemoryBytes: 500 * 1024 * 1024,
            maxFileHandles: 200,
            maxCachedModules: 2000,
            checkInterval: 5000,
          },
          operationTimeout: 120000,
        });
      }).not.toThrow();
    });
  });
});
