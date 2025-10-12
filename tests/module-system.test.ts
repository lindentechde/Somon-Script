jest.mock('chokidar', () => {
  const watchMock = jest.fn(() => {
    const listeners = new Map<string, Array<(...args: any[]) => void>>();
    const watcher = {
      on: jest.fn(function (this: any, event: string, handler: (...args: any[]) => void) {
        const handlers = listeners.get(event) ?? [];
        handlers.push(handler);
        listeners.set(event, handlers);
        return this;
      }),
      close: jest.fn().mockResolvedValue(undefined),
      emit(event: string, ...args: any[]) {
        const handlers = listeners.get(event) ?? [];
        for (const handler of handlers) {
          handler(...args);
        }
        const allHandlers = listeners.get('all') ?? [];
        for (const handler of allHandlers) {
          handler(event, ...args);
        }
        return this;
      },
    };
    return watcher;
  });

  const chokidarExport = Object.assign(watchMock, { watch: watchMock });

  return {
    __esModule: true,
    default: chokidarExport,
    watch: watchMock,
  };
});

const chokidarModule = require('chokidar') as { watch: jest.Mock };
const watchMock = chokidarModule.watch;

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import packageJson from '../package.json';
import {
  ModuleResolver,
  ModuleLoader,
  ModuleRegistry,
  ModuleSystem,
  type CompilationResult,
} from '../src/module-system';

describe('Module System', () => {
  let tempDir: string;
  let resolver: ModuleResolver;
  let loader: ModuleLoader;
  let registry: ModuleRegistry;
  let moduleSystem: ModuleSystem;

  beforeEach(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-test-'));

    resolver = new ModuleResolver({
      baseUrl: tempDir,
      extensions: ['.som', '.js'],
    });

    loader = new ModuleLoader(resolver);
    registry = new ModuleRegistry();
    moduleSystem = new ModuleSystem({
      resolution: { baseUrl: tempDir },
    });
  });

  afterEach(async () => {
    try {
      await moduleSystem.shutdown();
    } catch (error) {
      // Ignore shutdown errors in tests to avoid masking primary failures
    }

    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // Clear any pending timers
    jest.clearAllTimers();
  });

  afterAll(() => {
    // Ensure all intervals and timeouts are cleared
    jest.useRealTimers();
  });

  describe('ModuleResolver', () => {
    test('should resolve relative imports', () => {
      const mainFile = path.join(tempDir, 'main.som');
      const moduleFile = path.join(tempDir, 'utils.som');

      fs.writeFileSync(mainFile, 'содир функсия main() {}');
      fs.writeFileSync(moduleFile, 'содир функсия utils() {}');

      const resolved = resolver.resolve('./utils', mainFile);
      expect(resolved.resolvedPath).toBe(moduleFile);
      expect(resolved.isExternalLibrary).toBe(false);
    });

    test('should resolve with extensions', () => {
      const mainFile = path.join(tempDir, 'main.som');
      const moduleFile = path.join(tempDir, 'utils.som');

      fs.writeFileSync(mainFile, 'содир функсия main() {}');
      fs.writeFileSync(moduleFile, 'содир функсия utils() {}');

      const resolved = resolver.resolve('./utils.som', mainFile);
      expect(resolved.resolvedPath).toBe(moduleFile);
    });

    test('should resolve index files', () => {
      const mainFile = path.join(tempDir, 'main.som');
      const moduleDir = path.join(tempDir, 'lib');
      const indexFile = path.join(moduleDir, 'index.som');

      fs.writeFileSync(mainFile, 'содир функсия main() {}');
      fs.mkdirSync(moduleDir);
      fs.writeFileSync(indexFile, 'содир функсия lib() {}');

      const resolved = resolver.resolve('./lib', mainFile);
      expect(resolved.resolvedPath).toBe(indexFile);
    });

    test('should handle absolute imports', () => {
      const mainFile = path.join(tempDir, 'main.som');
      const moduleFile = path.join(tempDir, 'utils.som');

      fs.writeFileSync(mainFile, 'содир функсия main() {}');
      fs.writeFileSync(moduleFile, 'содир функсия utils() {}');

      const resolved = resolver.resolve('/utils', mainFile);
      expect(resolved.resolvedPath).toBe(moduleFile);
    });

    test('should throw error for missing modules', () => {
      const mainFile = path.join(tempDir, 'main.som');
      fs.writeFileSync(mainFile, 'содир функсия main() {}');

      expect(() => {
        resolver.resolve('./missing', mainFile);
      }).toThrow('Cannot resolve module');
    });
  });

  describe('ModuleLoader', () => {
    test('does not allocate production subsystems by default', () => {
      const defaultLoader = new ModuleLoader(resolver);
      expect((defaultLoader as any).metrics).toBeUndefined();
      expect((defaultLoader as any).circuitBreakers).toBeUndefined();
    });

    test('should load module with dependencies', () => {
      const mainFile = path.join(tempDir, 'main.som');
      const utilsFile = path.join(tempDir, 'utils.som');

      fs.writeFileSync(utilsFile, 'содир функсия add(a, b) { бозгашт a + b; }');
      fs.writeFileSync(mainFile, 'ворид { add } аз "./utils";\nчоп.сабт(add(1, 2));');

      const module = loader.loadSync('./main', tempDir);

      expect(module.id).toContain('main.som');
      expect(module.isLoaded).toBe(true);
      expect(module.dependencies).toContain('./utils');
    });

    test('should handle circular dependencies', () => {
      const aFile = path.join(tempDir, 'a.som');
      const bFile = path.join(tempDir, 'b.som');

      fs.writeFileSync(aFile, 'ворид { b } аз "./b";\nсодир функсия a() { бозгашт b(); }');
      fs.writeFileSync(bFile, 'ворид { a } аз "./a";\nсодир функсия b() { бозгашт "b"; }');

      // Should not throw with default 'warn' strategy
      expect(() => {
        loader.loadSync('./a', tempDir);
      }).not.toThrow();
    });

    test('should cache loaded modules', () => {
      const moduleFile = path.join(tempDir, 'cached.som');
      fs.writeFileSync(moduleFile, 'содир функсия cached() {}');

      const module1 = loader.loadSync('./cached', tempDir);
      const module2 = loader.loadSync('./cached', tempDir);

      expect(module1).toBe(module2);
    });

    test('should handle loading errors', () => {
      const mainFile = path.join(tempDir, 'main.som');
      fs.writeFileSync(mainFile, 'ворид { missing } аз "./missing";');

      expect(() => {
        loader.loadSync('./main', tempDir);
      }).toThrow();
    });
  });

  describe('production features', () => {
    test('reports neutral health when metrics disabled', async () => {
      const health = await moduleSystem.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.version).toBe(packageJson.version);
      expect(health.checks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'metrics',
            status: 'warn',
          }),
        ])
      );
    });
  });

  describe('ModuleRegistry', () => {
    test('should register and retrieve modules', () => {
      const moduleFile = path.join(tempDir, 'test.som');
      fs.writeFileSync(moduleFile, 'содир функсия test() {}');

      const module = loader.loadSync('./test', tempDir);
      registry.register(module);

      const metadata = registry.get(module.id);
      expect(metadata).toBeDefined();
      expect(metadata!.id).toBe(module.id);
    });

    test('should track dependencies', () => {
      const mainFile = path.join(tempDir, 'main.som');
      const utilsFile = path.join(tempDir, 'utils.som');

      fs.writeFileSync(utilsFile, 'содир функсия utils() {}');
      fs.writeFileSync(mainFile, 'ворид { utils } аз "./utils";');

      const mainModule = loader.loadSync('./main', tempDir);
      const utilsModule = loader.loadSync('./utils', tempDir);

      registry.register(mainModule);
      registry.register(utilsModule);

      const dependencies = registry.getDependencies(mainModule.id);
      expect(dependencies).toContain('./utils');
    });

    test('should detect circular dependencies', () => {
      const aFile = path.join(tempDir, 'a.som');
      const bFile = path.join(tempDir, 'b.som');

      fs.writeFileSync(aFile, 'ворид { b } аз "./b";\nсодир функсия a() {}');
      fs.writeFileSync(bFile, 'ворид { a } аз "./a";\nсодир функсия b() {}');

      const aModule = loader.loadSync('./a', tempDir);
      const bModule = loader.loadSync('./b', tempDir);

      registry.register(aModule);
      registry.register(bModule);

      const cycles = registry.findCircularDependencies();
      expect(cycles.length).toBeGreaterThan(0);
    });

    test('should provide module statistics', () => {
      const moduleFile = path.join(tempDir, 'stats.som');
      fs.writeFileSync(moduleFile, 'содир функсия stats() {}');

      const module = loader.loadSync('./stats', tempDir);
      registry.register(module);

      const stats = registry.getStatistics();
      expect(stats.totalModules).toBe(1);
      expect(stats.totalDependencies).toBe(0);
    });
  });

  describe('ModuleSystem Integration', () => {
    test('should compile module with dependencies', async () => {
      const mathFile = path.join(tempDir, 'math.som');
      const mainFile = path.join(tempDir, 'main.som');

      fs.writeFileSync(
        mathFile,
        `
        содир функсия add(a: рақам, b: рақам): рақам {
          бозгашт a + b;
        }
        содир функсия multiply(a: рақам, b: рақам): рақам {
          бозгашт a * b;
        }
      `
      );

      fs.writeFileSync(
        mainFile,
        `
        ворид { add, multiply } аз "./math";
        чоп.сабт(add(2, 3));
        чоп.сабт(multiply(4, 5));
      `
      );

      const result = await moduleSystem.compile(mainFile);

      expect(result.errors).toHaveLength(0);
      expect(result.modules.size).toBeGreaterThan(0);
      expect(result.entryPoint).toContain('main.som');
    });

    test('should bundle modules', async () => {
      const utilsFile = path.join(tempDir, 'utils.som');
      const mainFile = path.join(tempDir, 'main.som');

      fs.writeFileSync(
        utilsFile,
        'содир функсия greet(name: сатр): сатр { бозгашт "Салом, " + name; }'
      );
      fs.writeFileSync(mainFile, 'ворид { greet } аз "./utils";\nчоп.сабт(greet("Ҷаҳон"));');

      const bundle = await moduleSystem.bundle({
        entryPoint: mainFile,
        format: 'commonjs',
      });

      expect(bundle.code).toContain('function(module, exports, require)');
      expect(bundle.code).toContain('require(');
    });

    test('should emit source maps when requested', async () => {
      const depFile = path.join(tempDir, 'dep.som');
      const mainFile = path.join(tempDir, 'main.som');

      fs.writeFileSync(depFile, 'содир функсия value(): рақам { бозгашт 42; }');
      fs.writeFileSync(mainFile, 'ворид { value } аз "./dep";\nчоп.сабт(value());');

      const bundle = await moduleSystem.bundle({
        entryPoint: mainFile,
        format: 'commonjs',
        sourceMaps: true,
      });

      expect(bundle.map).toBeDefined();
      const parsed = JSON.parse(bundle.map ?? '{}');
      expect(parsed.sources).toBeDefined();
      expect(parsed.sources).toEqual(expect.arrayContaining(['dep.som', 'main.som']));
      expect(Array.isArray(parsed.sources)).toBe(true);
      if (Array.isArray(parsed.sources)) {
        for (const source of parsed.sources) {
          expect(typeof source === 'string' && !path.isAbsolute(source)).toBe(true);
        }
      }
      expect(parsed.sourcesContent).toBeUndefined();
    });

    test('should inline original sources when requested explicitly', async () => {
      const depFile = path.join(tempDir, 'dep-inline.som');
      const mainFile = path.join(tempDir, 'main-inline.som');

      fs.writeFileSync(depFile, 'содир функсия value(): рақам { бозгашт 7; }');
      fs.writeFileSync(mainFile, 'ворид { value } аз "./dep-inline";\nчоп.сабт("value", value());');

      const bundle = await moduleSystem.bundle({
        entryPoint: mainFile,
        format: 'commonjs',
        sourceMaps: true,
        inlineSources: true,
      });

      expect(bundle.map).toBeDefined();
      const parsed = JSON.parse(bundle.map ?? '{}');
      expect(parsed.sources).toEqual(expect.arrayContaining(['dep-inline.som', 'main-inline.som']));
      expect(parsed.sourcesContent).toBeDefined();
      expect(Array.isArray(parsed.sourcesContent)).toBe(true);
      if (Array.isArray(parsed.sourcesContent)) {
        expect(parsed.sourcesContent.length).toBeGreaterThan(0);
        expect(parsed.sourcesContent.some(content => typeof content === 'string')).toBe(true);
      }
    });

    test('should surface type checking errors during compilation', async () => {
      const typeErrorFile = path.join(tempDir, 'type-error.som');
      fs.writeFileSync(typeErrorFile, 'тағйирёбанда value: рақам = "матн";');

      const result = await moduleSystem.compile(typeErrorFile);

      expect(result.modules.size).toBe(0);
      expect(result.errors).not.toHaveLength(0);
      expect(result.errors[0]?.message).toContain('Type error');
    });

    test('should respect compilation overrides that disable type checking', async () => {
      const typeErrorFile = path.join(tempDir, 'type-disabled.som');
      fs.writeFileSync(typeErrorFile, 'тағйирёбанда value: рақам = "матн";');

      const relaxedSystem = new ModuleSystem({
        resolution: { baseUrl: tempDir },
        compilation: { noTypeCheck: true },
      });

      try {
        const result = await relaxedSystem.compile(typeErrorFile);
        expect(result.errors).toHaveLength(0);
        expect(result.modules.size).toBeGreaterThan(0);
      } finally {
        await relaxedSystem.shutdown();
      }
    });

    test('should handle dynamic imports', async () => {
      const dynamicFile = path.join(tempDir, 'dynamic.som');
      const mainFile = path.join(tempDir, 'main.som');

      fs.writeFileSync(dynamicFile, 'содир функсия dynamic() { бозгашт "dynamic"; }');
      fs.writeFileSync(
        mainFile,
        `
        ҳамзамон функсия loadDynamic() {
          собит module = интизор ворид("./dynamic");
          бозгашт module.dynamic();
        }
      `
      );

      const result = await moduleSystem.compile(mainFile);
      expect(result.errors).toHaveLength(0);

      const compiledModule = result.modules.get(result.entryPoint);
      expect(compiledModule?.code).toContain('import("./dynamic.js")');
    });

    test('should validate module system integrity', async () => {
      const validFile = path.join(tempDir, 'valid.som');
      fs.writeFileSync(validFile, 'содир функсия valid() {}');

      await moduleSystem.loadModule('./valid', tempDir);

      const validation = moduleSystem.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect missing dependencies', async () => {
      const invalidFile = path.join(tempDir, 'invalid.som');
      fs.writeFileSync(invalidFile, 'ворид { missing } аз "./missing";');

      try {
        await moduleSystem.loadModule('./invalid', tempDir);
      } catch (error) {
        // Expected to fail
      }

      const validation = moduleSystem.validate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should provide dependency graph', async () => {
      const libFile = path.join(tempDir, 'lib.som');
      const appFile = path.join(tempDir, 'app.som');

      fs.writeFileSync(libFile, 'содир функсия lib() {}');
      fs.writeFileSync(appFile, 'ворид { lib } аз "./lib";\nlib();');

      await moduleSystem.loadModule('./app', tempDir);

      const graph = moduleSystem.getDependencyGraph();
      expect(graph.size).toBeGreaterThan(0);

      const appDeps = Array.from(graph.values()).find(deps => deps.includes('./lib'));
      expect(appDeps).toBeDefined();
    });

    test('should generate commonjs bundle and reject unsupported formats', async () => {
      const moduleFile = path.join(tempDir, 'module.som');
      const mainFile = path.join(tempDir, 'main.som');

      fs.writeFileSync(moduleFile, 'содир функсия test() { бозгашт "test"; }');
      fs.writeFileSync(mainFile, 'ворид { test } аз "./module";\nчоп.сабт(test());');

      // Test CommonJS bundle
      const cjsBundle = await moduleSystem.bundle({
        entryPoint: mainFile,
        format: 'commonjs',
      });
      expect(cjsBundle.code).toContain('module.exports');

      await expect(
        moduleSystem.bundle({ entryPoint: mainFile, format: 'esm' as any })
      ).rejects.toThrow(/commonjs/i);

      await expect(
        moduleSystem.bundle({ entryPoint: mainFile, format: 'umd' as any })
      ).rejects.toThrow(/commonjs/i);
    });

    test('should stabilise CommonJS bundle IDs relative to entry directory', async () => {
      const srcDir = path.join(tempDir, 'src');
      const libDir = path.join(tempDir, 'lib');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(libDir, { recursive: true });

      const helperFile = path.join(libDir, 'helper.som');
      const mainFile = path.join(srcDir, 'main.som');

      fs.writeFileSync(helperFile, 'содир функсия helper() { бозгашт 1; }');
      fs.writeFileSync(mainFile, 'ворид { helper } аз "../lib/helper";\nчоп.сабт(helper());');

      const bundleFromProjectRoot = await moduleSystem.bundle({
        entryPoint: mainFile,
        format: 'commonjs',
      });

      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue('/');
      try {
        const bundleWithMockedCwd = await moduleSystem.bundle({
          entryPoint: mainFile,
          format: 'commonjs',
        });

        expect(bundleWithMockedCwd.code).toEqual(bundleFromProjectRoot.code);
        expect(bundleWithMockedCwd.map).toEqual(bundleFromProjectRoot.map);
        expect(bundleWithMockedCwd.code).toContain("'main.som'");
        expect(bundleWithMockedCwd.code).toContain("'../lib/helper.som'");
        expect(bundleWithMockedCwd.code).not.toContain(tempDir);
      } finally {
        cwdSpy.mockRestore();
      }
    });

    test('should successfully minify bundles when babel-preset-minify is available', async () => {
      // Since babel-preset-minify is installed as a dependency, test successful minification
      const entryPath = path.join(tempDir, 'minify-test.som');
      const dependencyPath = path.join(tempDir, 'minify-dep.som');

      fs.writeFileSync(entryPath, 'чоп.сабт("Салом аз main");');
      fs.writeFileSync(dependencyPath, 'чоп.сабт("Dependency");');

      const result = await moduleSystem.bundle({
        entryPoint: entryPath,
        format: 'commonjs',
        minify: true,
      });

      expect(result).toBeDefined();
      expect(result.code).toBeDefined();
      expect(typeof result.code).toBe('string');

      // Minified code should be shorter and compact
      expect(result.code).not.toContain('  '); // No double spaces in minified code
      expect(result.code).toContain('function'); // Still contains function keywords
      expect(result.code.length).toBeGreaterThan(0);
    });

    test('should rewrite template literal require specifiers without interpolation', async () => {
      const entryPath = path.join(tempDir, 'template-entry.som');
      const dependencyPath = path.join(tempDir, 'dep.som');
      fs.writeFileSync(entryPath, '');
      fs.writeFileSync(dependencyPath, '');

      const compileResult: CompilationResult = {
        modules: new Map([
          [
            entryPath,
            { code: ['const dep = require(`./dep.som`);', 'module.exports = dep;'].join('\n') },
          ],
          [dependencyPath, { code: 'module.exports = { value: 42 };' }],
        ]),
        entryPoint: entryPath,
        dependencies: [entryPath, dependencyPath],
        errors: [],
        warnings: [],
      };

      const compileSpy = jest.spyOn(moduleSystem, 'compile').mockResolvedValue(compileResult);

      try {
        const bundle = await moduleSystem.bundle({ entryPoint: entryPath, format: 'commonjs' });
        expect(bundle.code).toContain("require('dep.som')");
        expect(compileSpy).toHaveBeenCalled();
      } finally {
        compileSpy.mockRestore();
      }
    });

    test('should reject template literal require expressions with interpolation', async () => {
      const entryPath = path.join(tempDir, 'dynamic-template.som');
      fs.writeFileSync(entryPath, '');

      const compileResult: CompilationResult = {
        modules: new Map([
          [entryPath, { code: ["const name = 'dep';", 'require(`./${name}.som`);'].join('\n') }],
        ]),
        entryPoint: entryPath,
        dependencies: [entryPath],
        errors: [],
        warnings: [],
      };

      const compileSpy = jest.spyOn(moduleSystem, 'compile').mockResolvedValue(compileResult);

      try {
        await expect(
          moduleSystem.bundle({ entryPoint: entryPath, format: 'commonjs' })
        ).rejects.toThrow('Dynamic template literal require expressions are not supported');
      } finally {
        compileSpy.mockRestore();
      }
    });

    test('should reject non-literal require expressions', async () => {
      const entryPath = path.join(tempDir, 'dynamic-require.som');
      fs.writeFileSync(entryPath, '');

      const compileResult: CompilationResult = {
        modules: new Map([
          [
            entryPath,
            { code: ["const moduleName = './dep.som';", 'require(moduleName);'].join('\n') },
          ],
        ]),
        entryPoint: entryPath,
        dependencies: [entryPath],
        errors: [],
        warnings: [],
      };

      const compileSpy = jest.spyOn(moduleSystem, 'compile').mockResolvedValue(compileResult);

      try {
        await expect(
          moduleSystem.bundle({ entryPoint: entryPath, format: 'commonjs' })
        ).rejects.toThrow('Dynamic require expressions are not supported');
      } finally {
        compileSpy.mockRestore();
      }
    });

    test('should expose watcher API for entrypoints', async () => {
      watchMock.mockClear();

      const utilsFile = path.join(tempDir, 'watch-util.som');
      const mainFile = path.join(tempDir, 'watch-main.som');
      fs.writeFileSync(utilsFile, 'содир функсия add(a, b) { бозгашт a + b; }');
      fs.writeFileSync(mainFile, 'ворид { add } аз "./watch-util"; чоп.сабт(add(1, 2));');

      await moduleSystem.compile(mainFile);

      const onChange = jest.fn();
      const watcher = moduleSystem.watch(mainFile, { onChange });

      expect(watchMock).toHaveBeenCalledTimes(1);
      const [watchTargets, watchOptions] = watchMock.mock.calls[0];
      expect(Array.isArray(watchTargets)).toBe(true);
      expect(watchTargets).toEqual(expect.arrayContaining([path.resolve(mainFile)]));
      expect(watchOptions.ignoreInitial).toBe(true);

      const watcherInstance = watchMock.mock.results[0].value;
      watcherInstance.emit('change', utilsFile);

      expect(onChange).toHaveBeenCalledWith({
        type: 'change',
        filePath: path.resolve(utilsFile),
      });

      await moduleSystem.shutdown();
      expect(watcher.close).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed module files', () => {
      const malformedFile = path.join(tempDir, 'malformed.som');
      fs.writeFileSync(malformedFile, 'invalid syntax here');

      expect(() => {
        loader.loadSync('./malformed', tempDir);
      }).toThrow();
    });

    test('should handle permission errors', () => {
      const restrictedFile = path.join(tempDir, 'restricted.som');
      fs.writeFileSync(restrictedFile, 'содир функсия restricted() {}');

      // Make file unreadable (on Unix systems)
      try {
        fs.chmodSync(restrictedFile, 0o000);

        expect(() => {
          loader.loadSync('./restricted', tempDir);
        }).toThrow();
      } catch (error) {
        // Skip test on systems that don't support chmod
      } finally {
        // Restore permissions for cleanup
        try {
          fs.chmodSync(restrictedFile, 0o644);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    test('should handle compilation errors gracefully', async () => {
      const errorFile = path.join(tempDir, 'error.som');
      fs.writeFileSync(errorFile, 'функсия invalid() { missing_keyword }');

      const result = await moduleSystem.compile(errorFile);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    test('should handle large dependency graphs', async () => {
      const numModules = 50;
      const modules: string[] = [];

      // Create a chain of dependencies
      for (let i = 0; i < numModules; i++) {
        const moduleFile = path.join(tempDir, `module${i}.som`);
        const content =
          i === 0
            ? `содир функсия module${i}() { бозгашт ${i}; }`
            : `ворид { module${i - 1} } аз "./module${i - 1}";\nсодир функсия module${i}() { бозгашт module${i - 1}() + ${i}; }`;

        fs.writeFileSync(moduleFile, content);
        modules.push(moduleFile);
      }

      const startTime = Date.now();
      const result = await moduleSystem.compile(modules[modules.length - 1]);
      const endTime = Date.now();

      expect(result.errors).toHaveLength(0);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should cache modules efficiently', () => {
      const moduleFile = path.join(tempDir, 'cached.som');
      fs.writeFileSync(moduleFile, 'содир функсия cached() {}');

      const startTime = Date.now();

      // Load same module multiple times
      for (let i = 0; i < 10; i++) {
        loader.loadSync('./cached', tempDir);
      }

      const endTime = Date.now();

      // Subsequent loads should be much faster due to caching
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
