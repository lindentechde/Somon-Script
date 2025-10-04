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

  describe('Resolution Options Validation', () => {
    it('should reject non-string baseUrl', () => {
      expect(() => {
        new ModuleSystem({
          resolution: {
            baseUrl: 123 as any,
          },
        });
      }).toThrow(/resolution.baseUrl must be a string/);
    });

    it('should reject invalid paths object', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          resolution: {
            ...validBaseConfig.resolution,
            paths: 'invalid' as any,
          },
        });
      }).toThrow(/resolution.paths must be an object/);
    });

    it('should reject paths with non-array values', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          resolution: {
            ...validBaseConfig.resolution,
            paths: {
              '@app/*': 'invalid' as any,
            },
          },
        });
      }).toThrow(/resolution.paths\['@app\/\*'\] must be an array of strings/);
    });

    it('should reject paths with non-string array elements', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          resolution: {
            ...validBaseConfig.resolution,
            paths: {
              '@app/*': ['src/*', 123 as any],
            },
          },
        });
      }).toThrow(/resolution.paths\['@app\/\*'\] must contain only strings/);
    });

    it('should reject non-array extensions', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          resolution: {
            ...validBaseConfig.resolution,
            extensions: 'invalid' as any,
          },
        });
      }).toThrow(/resolution.extensions must be an array of strings/);
    });

    it('should reject extensions with non-string elements', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          resolution: {
            ...validBaseConfig.resolution,
            extensions: ['.som', 123 as any],
          },
        });
      }).toThrow(/resolution.extensions must contain only strings/);
    });

    it('should reject empty extensions array', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          resolution: {
            ...validBaseConfig.resolution,
            extensions: [],
          },
        });
      }).toThrow(/resolution.extensions must not be empty/);
    });

    it('should reject extensions without leading dot', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          resolution: {
            ...validBaseConfig.resolution,
            extensions: ['.som', 'js', 'ts'],
          },
        });
      }).toThrow(/resolution.extensions must start with a dot, invalid: js, ts/);
    });

    it('should reject non-array moduleDirectories', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          resolution: {
            ...validBaseConfig.resolution,
            moduleDirectories: 'invalid' as any,
          },
        });
      }).toThrow(/resolution.moduleDirectories must be an array of strings/);
    });

    it('should reject moduleDirectories with non-string elements', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          resolution: {
            ...validBaseConfig.resolution,
            moduleDirectories: ['node_modules', 123 as any],
          },
        });
      }).toThrow(/resolution.moduleDirectories must contain only strings/);
    });

    it('should reject empty moduleDirectories array', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          resolution: {
            ...validBaseConfig.resolution,
            moduleDirectories: [],
          },
        });
      }).toThrow(/resolution.moduleDirectories must not be empty/);
    });

    it('should reject non-boolean allowJs', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          resolution: {
            ...validBaseConfig.resolution,
            allowJs: 'true' as any,
          },
        });
      }).toThrow(/resolution.allowJs must be a boolean/);
    });

    it('should reject non-boolean resolveJsonModule', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          resolution: {
            ...validBaseConfig.resolution,
            resolveJsonModule: 'true' as any,
          },
        });
      }).toThrow(/resolution.resolveJsonModule must be a boolean/);
    });

    it('should accept valid resolution options', () => {
      expect(() => {
        new ModuleSystem({
          resolution: {
            baseUrl: path.resolve(__dirname, '..'),
            paths: {
              '@app/*': ['src/*'],
              '@lib/*': ['lib/*', 'node_modules/*'],
            },
            extensions: ['.som', '.js', '.json'],
            moduleDirectories: ['node_modules', 'custom_modules'],
            allowJs: true,
            resolveJsonModule: true,
          },
        });
      }).not.toThrow();
    });
  });

  describe('Compilation Options Validation', () => {
    it('should reject invalid target', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          compilation: {
            target: 'es2022' as any,
          },
        });
      }).toThrow(/compilation.target must be one of: es5, es2015, es2020, esnext/);
    });

    it('should reject non-boolean sourceMap', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          compilation: {
            sourceMap: 'true' as any,
          },
        });
      }).toThrow(/compilation.sourceMap must be a boolean/);
    });

    it('should reject non-boolean minify', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          compilation: {
            minify: 'true' as any,
          },
        });
      }).toThrow(/compilation.minify must be a boolean/);
    });

    it('should reject non-boolean noTypeCheck', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          compilation: {
            noTypeCheck: 1 as any,
          },
        });
      }).toThrow(/compilation.noTypeCheck must be a boolean/);
    });

    it('should reject non-boolean strict', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          compilation: {
            strict: 'yes' as any,
          },
        });
      }).toThrow(/compilation.strict must be a boolean/);
    });

    it('should reject non-boolean watch', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          compilation: {
            watch: 1 as any,
          },
        });
      }).toThrow(/compilation.watch must be a boolean/);
    });

    it('should reject non-boolean compileOnSave', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          compilation: {
            compileOnSave: 1 as any,
          },
        });
      }).toThrow(/compilation.compileOnSave must be a boolean/);
    });

    it('should reject non-string output', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          compilation: {
            output: 123 as any,
          },
        });
      }).toThrow(/compilation.output must be a string/);
    });

    it('should reject non-string outDir', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          compilation: {
            outDir: 123 as any,
          },
        });
      }).toThrow(/compilation.outDir must be a string/);
    });

    it('should accept all valid targets', () => {
      const validTargets = ['es5', 'es2015', 'es2020', 'esnext'];

      for (const target of validTargets) {
        expect(() => {
          new ModuleSystem({
            ...validBaseConfig,
            compilation: {
              target: target as any,
            },
          });
        }).not.toThrow();
      }
    });

    it('should accept valid compilation options', () => {
      expect(() => {
        new ModuleSystem({
          ...validBaseConfig,
          compilation: {
            target: 'es2020',
            sourceMap: true,
            minify: true,
            noTypeCheck: false,
            strict: true,
            watch: false,
            compileOnSave: true,
            output: 'dist/bundle.js',
            outDir: 'dist',
          },
        });
      }).not.toThrow();
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
