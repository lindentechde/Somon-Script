import * as fs from 'fs';
import * as path from 'path';

export interface CompilerOptions {
  output?: string;
  target?: 'es5' | 'es2015' | 'es2020' | 'esnext';
  sourceMap?: boolean;
  minify?: boolean;
  noTypeCheck?: boolean;
  strict?: boolean;
  outDir?: string;
  watch?: boolean;
  compileOnSave?: boolean;
}

export interface SomonConfig {
  compilerOptions?: CompilerOptions;
  moduleSystem?: ModuleSystemConfig;
  bundle?: BundleConfig;
}

export interface ConfigValidationError {
  path: string;
  message: string;
}

type UnknownRecord = Record<string, unknown>;
function isObject(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function validateCompilerOptions(
  options: unknown,
  path = 'compilerOptions'
): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!isObject(options)) {
    return [{ path, message: 'must be an object' }];
  }

  // Validate target
  if (options.target !== undefined) {
    const validTargets = ['es5', 'es2015', 'es2020', 'esnext'];
    if (typeof options.target !== 'string' || !validTargets.includes(options.target)) {
      errors.push({
        path: `${path}.target`,
        message: `must be one of: ${validTargets.join(', ')}`,
      });
    }
  }

  // Validate boolean options
  const booleanOptions = ['sourceMap', 'minify', 'noTypeCheck', 'strict', 'watch', 'compileOnSave'];
  for (const option of booleanOptions) {
    if (options[option] !== undefined && typeof options[option] !== 'boolean') {
      errors.push({
        path: `${path}.${option}`,
        message: 'must be a boolean',
      });
    }
  }

  // Validate string options
  const stringOptions = ['output', 'outDir'];
  for (const option of stringOptions) {
    if (options[option] !== undefined && typeof options[option] !== 'string') {
      errors.push({
        path: `${path}.${option}`,
        message: 'must be a string',
      });
    }
  }

  // Check for unknown properties in compilerOptions
  const knownOptions = [
    'output',
    'target',
    'sourceMap',
    'minify',
    'noTypeCheck',
    'strict',
    'outDir',
    'watch',
    'compileOnSave',
  ];
  for (const key of Object.keys(options)) {
    if (!knownOptions.includes(key)) {
      errors.push({
        path: `${path}.${key}`,
        message: `unknown compiler option. Known options: ${knownOptions.join(', ')}`,
      });
    }
  }

  return errors;
}

// Module System configuration (kept independent of runtime types)
export interface ModuleSystemConfig {
  resolution?: {
    baseUrl?: string;
    paths?: Record<string, string[]>;
    extensions?: string[];
    moduleDirectories?: string[];
    allowJs?: boolean;
    resolveJsonModule?: boolean;
  };
  loading?: {
    encoding?: string;
    cache?: boolean;
    circularDependencyStrategy?: 'error' | 'warn' | 'ignore';
  };
  // Optional: delegate to compiler options used during module compilation if needed
  compilation?: CompilerOptions;
}

export interface BundleConfig {
  format?: 'commonjs' | 'esm' | 'umd';
  minify?: boolean;
  sourceMaps?: boolean;
  externals?: string[];
  force?: boolean;
  output?: string;
}

function validateModuleSystem(config: unknown, basePath = 'moduleSystem'): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];
  if (config === undefined) return errors;
  if (!isObject(config)) {
    return [{ path: basePath, message: 'must be an object' }];
  }

  const knownTop = ['resolution', 'loading', 'compilation'];
  for (const key of Object.keys(config)) {
    if (!knownTop.includes(key)) {
      errors.push({ path: `${basePath}.${key}`, message: `unknown property` });
    }
  }

  const res = (config as ModuleSystemConfig).resolution;
  if (res !== undefined) {
    if (typeof res !== 'object' || res === null) {
      errors.push({ path: `${basePath}.resolution`, message: 'must be an object' });
    } else {
      if (res.baseUrl !== undefined && typeof res.baseUrl !== 'string') {
        errors.push({ path: `${basePath}.resolution.baseUrl`, message: 'must be a string' });
      }
      if (res.paths !== undefined) {
        if (typeof res.paths !== 'object' || res.paths === null) {
          errors.push({ path: `${basePath}.resolution.paths`, message: 'must be an object' });
        } else {
          for (const [k, v] of Object.entries(res.paths)) {
            if (typeof k !== 'string' || !Array.isArray(v) || v.some(x => typeof x !== 'string')) {
              errors.push({
                path: `${basePath}.resolution.paths`,
                message: 'must be Record<string,string[]>',
              });
              break;
            }
          }
        }
      }
      const stringArray = (arr: unknown): arr is string[] =>
        Array.isArray(arr) && arr.every(x => typeof x === 'string');
      if (res.extensions !== undefined && !stringArray(res.extensions)) {
        errors.push({ path: `${basePath}.resolution.extensions`, message: 'must be string[]' });
      }
      if (res.moduleDirectories !== undefined && !stringArray(res.moduleDirectories)) {
        errors.push({
          path: `${basePath}.resolution.moduleDirectories`,
          message: 'must be string[]',
        });
      }
      if (res.allowJs !== undefined && typeof res.allowJs !== 'boolean') {
        errors.push({ path: `${basePath}.resolution.allowJs`, message: 'must be a boolean' });
      }
      if (res.resolveJsonModule !== undefined && typeof res.resolveJsonModule !== 'boolean') {
        errors.push({
          path: `${basePath}.resolution.resolveJsonModule`,
          message: 'must be a boolean',
        });
      }
    }
  }

  const load = (config as ModuleSystemConfig).loading;
  if (load !== undefined) {
    if (typeof load !== 'object' || load === null) {
      errors.push({ path: `${basePath}.loading`, message: 'must be an object' });
    } else {
      if (load.encoding !== undefined && typeof load.encoding !== 'string') {
        errors.push({ path: `${basePath}.loading.encoding`, message: 'must be a string' });
      }
      if (load.cache !== undefined && typeof load.cache !== 'boolean') {
        errors.push({ path: `${basePath}.loading.cache`, message: 'must be a boolean' });
      }
      if (
        load.circularDependencyStrategy !== undefined &&
        !['error', 'warn', 'ignore'].includes(load.circularDependencyStrategy)
      ) {
        errors.push({
          path: `${basePath}.loading.circularDependencyStrategy`,
          message: `must be one of: error, warn, ignore`,
        });
      }
    }
  }

  // Reuse compiler options validation for optional compilation section
  if (config.compilation !== undefined) {
    errors.push(
      ...validateCompilerOptions(
        (config as ModuleSystemConfig).compilation,
        `${basePath}.compilation`
      )
    );
  }

  return errors;
}

function validateBundle(config: unknown, basePath = 'bundle'): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];
  if (config === undefined) return errors;
  if (!isObject(config)) {
    return [{ path: basePath, message: 'must be an object' }];
  }

  const obj = config as Partial<BundleConfig>;

  if (obj.format !== undefined && !['commonjs', 'esm', 'umd'].includes(obj.format)) {
    errors.push({ path: `${basePath}.format`, message: 'must be one of: commonjs, esm, umd' });
  }
  if (obj.minify !== undefined && typeof obj.minify !== 'boolean') {
    errors.push({ path: `${basePath}.minify`, message: 'must be a boolean' });
  }
  if (obj.sourceMaps !== undefined && typeof obj.sourceMaps !== 'boolean') {
    errors.push({ path: `${basePath}.sourceMaps`, message: 'must be a boolean' });
  }
  if (obj.force !== undefined && typeof obj.force !== 'boolean') {
    errors.push({ path: `${basePath}.force`, message: 'must be a boolean' });
  }
  if (obj.output !== undefined && typeof obj.output !== 'string') {
    errors.push({ path: `${basePath}.output`, message: 'must be a string' });
  }
  if (obj.externals !== undefined) {
    const externals = obj.externals;
    if (!Array.isArray(externals) || externals.some(x => typeof x !== 'string')) {
      errors.push({ path: `${basePath}.externals`, message: 'must be string[]' });
    }
  }
  return errors;
}

function validateConfig(config: unknown): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!isObject(config)) {
    return [{ path: 'root', message: 'configuration must be an object' }];
  }

  // Check for unknown top-level properties
  const knownProperties = ['compilerOptions', 'moduleSystem', 'bundle'];
  for (const key of Object.keys(config)) {
    if (!knownProperties.includes(key)) {
      errors.push({
        path: key,
        message: `unknown configuration property. Known properties: ${knownProperties.join(', ')}`,
      });
    }
  }

  // Validate compilerOptions if present
  if ((config as SomonConfig).compilerOptions !== undefined) {
    errors.push(...validateCompilerOptions((config as SomonConfig).compilerOptions));
  }
  // Validate moduleSystem if present
  if ((config as SomonConfig).moduleSystem !== undefined) {
    errors.push(...validateModuleSystem((config as SomonConfig).moduleSystem));
  }
  // Validate bundle if present
  if ((config as SomonConfig).bundle !== undefined) {
    errors.push(...validateBundle((config as SomonConfig).bundle));
  }

  return errors;
}

function loadConfigFromFile(configPath: string): SomonConfig {
  try {
    const json = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(json);

    // Validate the configuration
    const validationErrors = validateConfig(config);
    if (validationErrors.length > 0) {
      console.warn(`Warning: Invalid configuration in ${configPath}:`);
      for (const error of validationErrors) {
        console.warn(`  ${error.path}: ${error.message}`);
      }
      // Return empty config on validation errors to use defaults
      return {};
    }

    return config as SomonConfig;
  } catch (error) {
    console.warn(
      `Warning: Failed to parse config file ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return {};
  }
}

export function loadConfig(startPath: string): SomonConfig {
  let dir = path.resolve(startPath);
  let parent = '';
  while (dir !== parent) {
    const configPath = path.join(dir, 'somon.config.json');
    if (fs.existsSync(configPath)) {
      return loadConfigFromFile(configPath);
    }
    parent = dir;
    dir = path.dirname(dir);
  }
  return {};
}
