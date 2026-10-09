import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  BUNDLE_FORMATS,
  TARGETS,
  validateGlobalName,
  validateLib,
  type BundleFormat,
  type Target,
} from './targets';

export interface CompilerOptions {
  output?: string;
  target?: Target;
  /** TypeScript lib names, e.g. ["es2022", "dom"]. */
  lib?: string[];
  useDefineForClassFields?: boolean;
  sourceMap?: boolean;
  minify?: boolean;
  noTypeCheck?: boolean;
  strict?: boolean;
  outDir?: string;
  watch?: boolean;
  compileOnSave?: boolean;
  /** TypeScript's legacy decorators, which may decorate parameters too. */
  experimentalDecorators?: boolean;
  /** Module format of the output: 'commonjs' (default) or 'esm'. */
  module?: 'commonjs' | 'esm';
  /** Type checker: 'somon' (default) or 'typescript'. */
  checker?: 'somon' | 'typescript';
  /** Language of the TypeScript checker's diagnostics: 'en' (default), 'ru' or 'tj'. */
  locale?: 'en' | 'ru' | 'tj';
  /** Also write a TypeScript declaration file (`.d.ts`) next to the output. */
  declaration?: boolean;
}

/** Allowed values of the compiler options that take one of a few strings. */
const ENUM_OPTIONS: Readonly<Record<string, readonly string[]>> = {
  module: ['commonjs', 'esm'],
  checker: ['somon', 'typescript'],
  locale: ['en', 'ru', 'tj'],
};

export interface SomonConfig {
  compilerOptions?: CompilerOptions;
  moduleSystem?: ModuleSystemConfig;
  bundle?: BundleConfig;
  /** Settings of the formatter (`somon fmt`). */
  fmt?: FmtConfig;
}

export interface FmtConfig {
  /** Spaces per indentation level (1–16, default 4). */
  indent?: number;
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
/** A JSON object: not null, and not an array. */
function isObject(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejectUnknownKeys(
  obj: object,
  known: readonly string[],
  basePath: string
): ConfigValidationError[] {
  return Object.keys(obj)
    .filter(key => !known.includes(key))
    .map(key => ({
      path: `${basePath}.${key}`,
      message: `unknown property. Known properties: ${known.join(', ')}`,
    }));
}

/** `target`, `lib` (names of the libs TypeScript ships) and `useDefineForClassFields`. */
function validateTargetOptions(options: UnknownRecord, path: string): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];
  if (options.target !== undefined) {
    const validTargets: readonly string[] = TARGETS;
    if (typeof options.target !== 'string' || !validTargets.includes(options.target)) {
      errors.push({
        path: `${path}.target`,
        message: `must be one of: ${validTargets.join(', ')}`,
      });
    }
  }
  if (options.lib !== undefined) {
    for (const message of validateLib(options.lib)) {
      errors.push({ path: `${path}.lib`, message });
    }
  }
  const useDefine = options.useDefineForClassFields;
  if (useDefine !== undefined && typeof useDefine !== 'boolean') {
    errors.push({ path: `${path}.useDefineForClassFields`, message: 'must be a boolean' });
  }
  return errors;
}

/** Options that take one of a few strings (`module`, `checker`, `locale`). */
function validateEnumOptions(options: UnknownRecord, path: string): ConfigValidationError[] {
  return Object.entries(ENUM_OPTIONS)
    .filter(([option, values]) => {
      const value = options[option];
      return value !== undefined && (typeof value !== 'string' || !values.includes(value));
    })
    .map(([option, values]) => ({
      path: `${path}.${option}`,
      message: `must be one of: ${values.join(', ')}`,
    }));
}

function validateCompilerOptions(
  options: unknown,
  path = 'compilerOptions'
): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!isObject(options)) {
    return [{ path, message: 'must be an object' }];
  }

  // Validate target, lib and useDefineForClassFields
  errors.push(...validateTargetOptions(options, path));

  errors.push(...validateEnumOptions(options, path));

  // Validate boolean options
  const booleanOptions = [
    'sourceMap',
    'minify',
    'noTypeCheck',
    'strict',
    'watch',
    'compileOnSave',
    'experimentalDecorators',
    'declaration',
  ];
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
    'lib',
    'useDefineForClassFields',
    'sourceMap',
    'minify',
    'noTypeCheck',
    'strict',
    'outDir',
    'watch',
    'compileOnSave',
    'experimentalDecorators',
    'module',
    'checker',
    'locale',
    'declaration',
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
  format?: BundleFormat;
  /** For the 'iife' format: the global (`globalThis[globalName]`) that receives the entry's exports. */
  globalName?: string;
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

const KNOWN_MODULE_SYSTEM_TOP_KEYS: ReadonlySet<string> = new Set([
  'resolution',
  'loading',
  'compilation',
]);

function validateModuleSystemTopLevel(config: object, basePath: string): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  for (const key of Object.keys(config)) {
    if (!KNOWN_MODULE_SYSTEM_TOP_KEYS.has(key)) {
      errors.push({ path: `${basePath}.${key}`, message: `unknown property` });
    }
  }

  return errors;
}

const KNOWN_RESOLUTION_KEYS = [
  'baseUrl',
  'paths',
  'extensions',
  'moduleDirectories',
  'allowJs',
  'resolveJsonModule',
] as const;

const KNOWN_LOADING_KEYS = ['encoding', 'cache', 'circularDependencyStrategy'] as const;

const KNOWN_BUNDLE_KEYS = [
  'format',
  'globalName',
  'minify',
  'sourceMaps',
  'inlineSources',
  'externals',
  'output',
] as const;

function validateResolutionSection(resolution: unknown, basePath: string): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];
  if (resolution === undefined) return errors;

  if (!isObject(resolution)) {
    return [{ path: basePath, message: 'must be an object' }];
  }

  const res = resolution as NonNullable<ModuleSystemConfig['resolution']>;

  errors.push(...rejectUnknownKeys(res, KNOWN_RESOLUTION_KEYS, basePath));

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

  if (!isObject(paths)) {
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

  if (!isObject(loading)) {
    return [{ path: basePath, message: 'must be an object' }];
  }

  const load = loading as NonNullable<ModuleSystemConfig['loading']>;

  errors.push(...rejectUnknownKeys(load, KNOWN_LOADING_KEYS, basePath));

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

  errors.push(...rejectUnknownKeys(obj, KNOWN_BUNDLE_KEYS, basePath));

  // Validate each property separately to reduce complexity
  errors.push(...validateBundleFormat(obj.format, basePath));
  if (obj.globalName !== undefined) {
    const problem = validateGlobalName(obj.globalName);
    if (problem) errors.push({ path: `${basePath}.globalName`, message: problem });
  }
  errors.push(...validateBundleBooleanProps(obj, basePath));
  errors.push(...validateBundleOutput(obj.output, basePath));
  errors.push(...validateBundleExternals(obj.externals, basePath));

  return errors;
}

function validateBundleFormat(format: unknown, basePath: string): ConfigValidationError[] {
  const formats: readonly unknown[] = BUNDLE_FORMATS;
  if (format !== undefined && !formats.includes(format)) {
    return [
      {
        path: `${basePath}.format`,
        message: `must be one of: ${BUNDLE_FORMATS.join(', ')}`,
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

const KNOWN_FMT_KEYS = ['indent'] as const;

function validateFmt(config: unknown, basePath = 'fmt'): ConfigValidationError[] {
  if (config === undefined) return [];
  if (!isObject(config)) {
    return [{ path: basePath, message: 'must be an object' }];
  }
  const errors = rejectUnknownKeys(config, KNOWN_FMT_KEYS, basePath);
  const indent = (config as FmtConfig).indent;
  if (indent !== undefined && !(Number.isInteger(indent) && indent >= 1 && indent <= 16)) {
    errors.push({ path: `${basePath}.indent`, message: 'must be an integer from 1 to 16' });
  }
  return errors;
}

function validateConfig(config: unknown): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!isObject(config)) {
    return [{ path: 'root', message: 'configuration must be an object' }];
  }

  // Check for unknown top-level properties
  const knownProperties = ['compilerOptions', 'moduleSystem', 'bundle', 'fmt'];
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
  errors.push(...validateFmt((config as SomonConfig).fmt));

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

export interface LoadedConfig {
  config: SomonConfig;
  /** Absolute path of the somon.config.json that was found, if any. */
  configPath?: string;
  /** Directory containing the config file; relative paths in the config resolve against it. */
  configDir?: string;
}

/**
 * Find the nearest somon.config.json at or above `startPath` and report where it was found.
 */
export function loadConfigWithPath(startPath: string): LoadedConfig {
  let dir = path.resolve(startPath);
  let parent = '';
  while (dir !== parent) {
    const configPath = path.join(dir, 'somon.config.json');
    if (fs.existsSync(configPath)) {
      return { config: loadConfigFromFile(configPath), configPath, configDir: dir };
    }
    parent = dir;
    dir = path.dirname(dir);
  }
  return { config: {} };
}

export function loadConfig(startPath: string): SomonConfig {
  return loadConfigWithPath(startPath).config;
}
