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

export class ConfigError extends Error {
  public readonly details: ConfigValidationError[];

  constructor(message: string, details: ConfigValidationError[] = []) {
    super(message);
    this.name = 'ConfigError';
    this.details = details;
  }
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
  // Production features
  metrics?: boolean;
  circuitBreakers?: boolean;
  logger?: boolean;
  managementServer?: boolean;
  managementPort?: number;
}

export interface BundleConfig {
  format?: 'commonjs';
  minify?: boolean;
  sourceMaps?: boolean;
  inlineSources?: boolean;
  externals?: string[];
  output?: string;
}

function validateModuleSystem(config: unknown, basePath = 'moduleSystem'): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];
  if (config === undefined) return errors;
  if (!isObject(config)) {
    return [{ path: basePath, message: 'must be an object' }];
  }

  // Validate top-level properties
  errors.push(...validateModuleSystemTopLevel(config, basePath));

  const moduleConfig = config as ModuleSystemConfig;

  // Validate each section
  errors.push(...validateResolutionSection(moduleConfig.resolution, `${basePath}.resolution`));
  errors.push(...validateLoadingSection(moduleConfig.loading, `${basePath}.loading`));

  // Reuse compiler options validation for optional compilation section
  if (moduleConfig.compilation !== undefined) {
    errors.push(...validateCompilerOptions(moduleConfig.compilation, `${basePath}.compilation`));
  }

  return errors;
}

function validateModuleSystemTopLevel(config: object, basePath: string): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];
  const knownTop = [
    'resolution',
    'loading',
    'compilation',
    'metrics',
    'circuitBreakers',
    'logger',
    'managementServer',
    'managementPort',
  ];

  for (const key of Object.keys(config)) {
    if (!knownTop.includes(key)) {
      errors.push({ path: `${basePath}.${key}`, message: `unknown property` });
    }
  }

  return errors;
}

function validateResolutionSection(resolution: unknown, basePath: string): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];
  if (resolution === undefined) return errors;

  if (typeof resolution !== 'object' || resolution === null) {
    return [{ path: basePath, message: 'must be an object' }];
  }

  const res = resolution as NonNullable<ModuleSystemConfig['resolution']>;

  // Validate individual properties
  errors.push(...validateResolutionBaseUrl(res.baseUrl, basePath));
  errors.push(...validateResolutionPaths(res.paths, basePath));
  errors.push(...validateResolutionExtensions(res.extensions, basePath));
  errors.push(...validateResolutionModuleDirectories(res.moduleDirectories, basePath));
  errors.push(...validateResolutionBooleanFlags(res, basePath));

  return errors;
}

function validateResolutionBaseUrl(baseUrl: unknown, basePath: string): ConfigValidationError[] {
  if (baseUrl !== undefined && typeof baseUrl !== 'string') {
    return [{ path: `${basePath}.baseUrl`, message: 'must be a string' }];
  }
  return [];
}

function validateResolutionPaths(paths: unknown, basePath: string): ConfigValidationError[] {
  if (paths === undefined) return [];

  if (typeof paths !== 'object' || paths === null) {
    return [{ path: `${basePath}.paths`, message: 'must be an object' }];
  }

  for (const [k, v] of Object.entries(paths)) {
    if (typeof k !== 'string' || !Array.isArray(v) || v.some(x => typeof x !== 'string')) {
      return [{ path: `${basePath}.paths`, message: 'must be Record<string,string[]>' }];
    }
  }

  return [];
}

function validateResolutionExtensions(
  extensions: unknown,
  basePath: string
): ConfigValidationError[] {
  const stringArray = (arr: unknown): arr is string[] =>
    Array.isArray(arr) && arr.every(x => typeof x === 'string');

  if (extensions !== undefined && !stringArray(extensions)) {
    return [{ path: `${basePath}.extensions`, message: 'must be string[]' }];
  }
  return [];
}

function validateResolutionModuleDirectories(
  moduleDirectories: unknown,
  basePath: string
): ConfigValidationError[] {
  const stringArray = (arr: unknown): arr is string[] =>
    Array.isArray(arr) && arr.every(x => typeof x === 'string');

  if (moduleDirectories !== undefined && !stringArray(moduleDirectories)) {
    return [{ path: `${basePath}.moduleDirectories`, message: 'must be string[]' }];
  }
  return [];
}

function validateResolutionBooleanFlags(
  res: NonNullable<ModuleSystemConfig['resolution']>,
  basePath: string
): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (res.allowJs !== undefined && typeof res.allowJs !== 'boolean') {
    errors.push({ path: `${basePath}.allowJs`, message: 'must be a boolean' });
  }

  if (res.resolveJsonModule !== undefined && typeof res.resolveJsonModule !== 'boolean') {
    errors.push({ path: `${basePath}.resolveJsonModule`, message: 'must be a boolean' });
  }

  return errors;
}

function validateLoadingSection(loading: unknown, basePath: string): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];
  if (loading === undefined) return errors;

  if (typeof loading !== 'object' || loading === null) {
    return [{ path: basePath, message: 'must be an object' }];
  }

  const load = loading as NonNullable<ModuleSystemConfig['loading']>;

  if (load.encoding !== undefined && typeof load.encoding !== 'string') {
    errors.push({ path: `${basePath}.encoding`, message: 'must be a string' });
  }

  if (load.cache !== undefined && typeof load.cache !== 'boolean') {
    errors.push({ path: `${basePath}.cache`, message: 'must be a boolean' });
  }

  if (
    load.circularDependencyStrategy !== undefined &&
    !['error', 'warn', 'ignore'].includes(load.circularDependencyStrategy)
  ) {
    errors.push({
      path: `${basePath}.circularDependencyStrategy`,
      message: `must be one of: error, warn, ignore`,
    });
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

  // Validate each property separately to reduce complexity
  errors.push(...validateBundleFormat(obj.format, basePath));
  errors.push(...validateBundleBooleanProps(obj, basePath));
  errors.push(...validateBundleOutput(obj.output, basePath));
  errors.push(...validateBundleExternals(obj.externals, basePath));

  return errors;
}

function validateBundleFormat(format: unknown, basePath: string): ConfigValidationError[] {
  if (format !== undefined && format !== 'commonjs') {
    return [
      {
        path: `${basePath}.format`,
        message: "SomonScript currently supports only the 'commonjs' bundle format",
      },
    ];
  }
  return [];
}

function validateBundleBooleanProps(
  obj: Partial<BundleConfig>,
  basePath: string
): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (obj.minify !== undefined && typeof obj.minify !== 'boolean') {
    errors.push({ path: `${basePath}.minify`, message: 'must be a boolean' });
  }
  if (obj.sourceMaps !== undefined && typeof obj.sourceMaps !== 'boolean') {
    errors.push({ path: `${basePath}.sourceMaps`, message: 'must be a boolean' });
  }
  if (obj.inlineSources !== undefined && typeof obj.inlineSources !== 'boolean') {
    errors.push({ path: `${basePath}.inlineSources`, message: 'must be a boolean' });
  }

  return errors;
}

function validateBundleOutput(output: unknown, basePath: string): ConfigValidationError[] {
  if (output !== undefined && typeof output !== 'string') {
    return [{ path: `${basePath}.output`, message: 'must be a string' }];
  }
  return [];
}

function validateBundleExternals(externals: unknown, basePath: string): ConfigValidationError[] {
  if (externals !== undefined) {
    if (!Array.isArray(externals) || externals.some(x => typeof x !== 'string')) {
      return [{ path: `${basePath}.externals`, message: 'must be string[]' }];
    }
  }
  return [];
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
  let fileContents: string;
  try {
    fileContents = fs.readFileSync(configPath, 'utf-8');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ConfigError(`Failed to read config file ${configPath}: ${reason}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fileContents);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ConfigError(`Failed to parse config file ${configPath}: ${reason}`);
  }

  const validationErrors = validateConfig(parsed);
  if (validationErrors.length > 0) {
    throw new ConfigError(`Invalid configuration in ${configPath}`, validationErrors);
  }

  return parsed as SomonConfig;
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
