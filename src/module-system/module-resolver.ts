import * as fs from 'fs';
import * as path from 'path';

export interface ModuleResolutionOptions {
  baseUrl?: string;
  paths?: Record<string, string[]>;
  extensions?: string[];
  moduleDirectories?: string[];
  allowJs?: boolean;
  resolveJsonModule?: boolean;
}

export interface ResolvedModule {
  resolvedPath: string;
  isExternalLibrary: boolean;
  packageName?: string;
  extension: string;
}

export class ModuleResolver {
  private options: Required<ModuleResolutionOptions>;

  constructor(options: ModuleResolutionOptions = {}) {
    if (!options.baseUrl) {
      throw new Error(
        'ModuleResolver requires explicit baseUrl - process.cwd() is not allowed in production. ' +
          'Pass the base directory explicitly to ensure deterministic module resolution.'
      );
    }
    this.options = {
      baseUrl: options.baseUrl,
      paths: options.paths || {},
      extensions: options.extensions || ['.som', '.js', '.json'],
      moduleDirectories: options.moduleDirectories || ['node_modules'],
      allowJs: options.allowJs ?? true,
      resolveJsonModule: options.resolveJsonModule ?? true,
    };
  }

  /**
   * Resolve a module specifier to an absolute file path
   */
  resolve(specifier: string, fromFile: string): ResolvedModule {
    // Determine a correct base directory whether 'fromFile' is a file path or a directory path
    let fromDir: string;
    try {
      if (fs.existsSync(fromFile) && fs.statSync(fromFile).isDirectory()) {
        fromDir = fromFile;
      } else {
        fromDir = path.dirname(fromFile);
      }
    } catch {
      // Fallback: treat input as a file path
      fromDir = path.dirname(fromFile);
    }

    // Handle already absolute file paths
    if (path.isAbsolute(specifier) && fs.existsSync(specifier)) {
      return {
        resolvedPath: specifier,
        isExternalLibrary: false,
        extension: path.extname(specifier),
      };
    }

    // Handle relative imports (./module, ../module)
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      return this.resolveRelative(specifier, fromDir);
    }

    // Handle absolute imports (/module)
    if (specifier.startsWith('/')) {
      return this.resolveAbsolute(specifier);
    }

    // Handle path mapping
    const mappedPath = this.resolveMappedPath(specifier);
    if (mappedPath) {
      return mappedPath;
    }

    // Handle node_modules resolution
    return this.resolveNodeModules(specifier, fromDir);
  }

  private resolveRelative(specifier: string, fromDir: string): ResolvedModule {
    const targetPath = path.resolve(fromDir, specifier);
    return this.resolveFile(targetPath, false);
  }

  private resolveAbsolute(specifier: string): ResolvedModule {
    const targetPath = path.resolve(this.options.baseUrl, specifier.slice(1));
    return this.resolveFile(targetPath, false);
  }

  private resolveMappedPath(specifier: string): ResolvedModule | null {
    for (const [pattern, mappings] of Object.entries(this.options.paths)) {
      if (this.matchesPattern(specifier, pattern)) {
        for (const mapping of mappings) {
          const mappedSpecifier = this.applyMapping(specifier, pattern, mapping);
          const targetPath = path.resolve(this.options.baseUrl, mappedSpecifier);

          try {
            return this.resolveFile(targetPath, false);
          } catch {
            continue; // Try next mapping
          }
        }
      }
    }
    return null;
  }

  private resolveNodeModules(specifier: string, fromDir: string): ResolvedModule {
    let currentDir = fromDir;

    while (currentDir !== path.dirname(currentDir)) {
      for (const moduleDir of this.options.moduleDirectories) {
        const modulePath = path.join(currentDir, moduleDir, specifier);

        try {
          return this.resolveFile(modulePath, true, specifier);
        } catch {
          // Continue searching
        }
      }
      currentDir = path.dirname(currentDir);
    }

    throw new Error(`Module not found: ${specifier}`);
  }

  private resolveFile(
    targetPath: string,
    isExternal: boolean,
    packageName?: string
  ): ResolvedModule {
    // Try exact path first
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      return {
        resolvedPath: targetPath,
        isExternalLibrary: isExternal,
        packageName,
        extension: path.extname(targetPath),
      };
    }

    // Try with extensions
    for (const ext of this.options.extensions) {
      const pathWithExt = targetPath + ext;
      if (fs.existsSync(pathWithExt) && fs.statSync(pathWithExt).isFile()) {
        return {
          resolvedPath: pathWithExt,
          isExternalLibrary: isExternal,
          packageName,
          extension: ext,
        };
      }
    }

    // Try as directory with index file
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
      // Check for package.json
      const packageJsonPath = path.join(targetPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.main) {
          const mainPath = path.resolve(targetPath, packageJson.main);
          return this.resolveFile(mainPath, isExternal, packageName);
        }
      }

      // Try index files
      for (const ext of this.options.extensions) {
        const indexPath = path.join(targetPath, `index${ext}`);
        if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
          return {
            resolvedPath: indexPath,
            isExternalLibrary: isExternal,
            packageName,
            extension: ext,
          };
        }
      }
    }

    throw new Error(`Cannot resolve module: ${targetPath}`);
  }

  private matchesPattern(specifier: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2);
      return specifier.startsWith(prefix);
    }
    return specifier === pattern;
  }

  private applyMapping(specifier: string, pattern: string, mapping: string): string {
    if (pattern === '*') {
      return mapping.replace('*', specifier);
    }
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2);
      const suffix = specifier.slice(prefix.length);
      return mapping.replace('*', suffix);
    }
    return mapping;
  }

  /**
   * Get all possible file extensions for module resolution
   */
  getExtensions(): string[] {
    return [...this.options.extensions];
  }

  /**
   * Check if a file extension is supported
   */
  isSupported(extension: string): boolean {
    return this.options.extensions.includes(extension);
  }

  /**
   * Update resolver options
   */
  updateOptions(options: Partial<ModuleResolutionOptions>): void {
    this.options = { ...this.options, ...options };
  }
}
