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
}

export interface ConfigValidationError {
  path: string;
  message: string;
}

function validateCompilerOptions(options: any, path = 'compilerOptions'): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (typeof options !== 'object' || options === null) {
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

function validateConfig(config: any): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (typeof config !== 'object' || config === null) {
    return [{ path: 'root', message: 'configuration must be an object' }];
  }

  // Check for unknown top-level properties
  const knownProperties = ['compilerOptions'];
  for (const key of Object.keys(config)) {
    if (!knownProperties.includes(key)) {
      errors.push({
        path: key,
        message: `unknown configuration property. Known properties: ${knownProperties.join(', ')}`,
      });
    }
  }

  // Validate compilerOptions if present
  if (config.compilerOptions !== undefined) {
    errors.push(...validateCompilerOptions(config.compilerOptions));
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
