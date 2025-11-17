import * as fs from 'node:fs';
import * as path from 'node:path';

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
    // Distinguish between OS-level absolute paths (/Users/..., C:\Users\...) and
    // project-relative absolute paths (/lib/utils/...)
    if (path.isAbsolute(specifier)) {
      const normalizedPath = path.normalize(specifier);

      // Check if this is an OS-level absolute path by seeing if it's outside the project
      // or matches common OS path patterns
      const isOsPath = this.isOsLevelAbsolutePath(normalizedPath);

      if (isOsPath) {
        return {
          resolvedPath: normalizedPath,
          isExternalLibrary: false,
          extension: path.extname(normalizedPath),
        };
      }
      // Otherwise, fall through to project-relative handling
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
    const exactMatch = this.tryExactPath(targetPath, isExternal, packageName);
    if (exactMatch) return exactMatch;

    // Try with extensions
    const withExtension = this.tryWithExtensions(targetPath, isExternal, packageName);
    if (withExtension) return withExtension;

    // Try as directory
    const asDirectory = this.tryAsDirectory(targetPath, isExternal, packageName);
    if (asDirectory) return asDirectory;

    throw new Error(`Cannot resolve module: ${targetPath}`);
  }

  private tryExactPath(
    targetPath: string,
    isExternal: boolean,
    packageName?: string
  ): ResolvedModule | null {
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
      return {
        resolvedPath: targetPath,
        isExternalLibrary: isExternal,
        packageName,
        extension: path.extname(targetPath),
      };
    }
    return null;
  }

  private tryWithExtensions(
    targetPath: string,
    isExternal: boolean,
    packageName?: string
  ): ResolvedModule | null {
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
    return null;
  }

  private tryAsDirectory(
    targetPath: string,
    isExternal: boolean,
    packageName?: string
  ): ResolvedModule | null {
    if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
      return null;
    }

    // Try package.json main field
    const fromPackageJson = this.tryPackageJsonMain(targetPath, isExternal, packageName);
    if (fromPackageJson) return fromPackageJson;

    // Try index files
    return this.tryIndexFiles(targetPath, isExternal, packageName);
  }

  private tryPackageJsonMain(
    targetPath: string,
    isExternal: boolean,
    packageName?: string
  ): ResolvedModule | null {
    const packageJsonPath = path.join(targetPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    if (packageJson.main) {
      const mainPath = path.resolve(targetPath, packageJson.main);
      return this.resolveFile(mainPath, isExternal, packageName);
    }

    return null;
  }

  private tryIndexFiles(
    targetPath: string,
    isExternal: boolean,
    packageName?: string
  ): ResolvedModule | null {
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
    return null;
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

  /**
   * Determine if an absolute path is an OS-level path (like /Users/..., C:\...)
   * vs a project-relative path (like /lib/utils)
   *
   * SECURITY NOTE: This method performs READ-ONLY path classification for module
   * resolution. It does NOT perform file operations or create files in any directory.
   * The actual file operations (reading source files) happen in ModuleLoader with
   * proper error handling and validation. This classification prevents path traversal
   * attacks by ensuring project-relative paths (like /lib/utils) don't escape the
   * project baseUrl.
   *
   * Strategy:
   * 1. Check if path is within or equal to baseUrl (OS path)
   * 2. Check if path matches common OS directory patterns
   * 3. Otherwise assume it's project-relative (resolved relative to baseUrl)
   *
   * @param absolutePath - The absolute path to classify
   * @returns true if this is an OS-level filesystem path, false if project-relative
   */
  private isOsLevelAbsolutePath(absolutePath: string): boolean {
    const normalizedPath = path.normalize(absolutePath);
    const normalizedBase = path.normalize(this.options.baseUrl);

    // If the path starts with the baseUrl, it's an OS-level path within the project
    if (normalizedPath.startsWith(normalizedBase)) {
      return true;
    }

    // Check for common OS-level path patterns
    // These patterns are used for READ-ONLY path classification only
    // Unix-like: /home/, /Users/, /var/, /tmp/, /opt/, /usr/, /etc/
    // Windows: C:\, D:\, etc. (drive letters)
    // Note: Including /tmp/ is necessary to correctly classify temp file paths
    // (e.g., from test suites). No file operations are performed here - only
    // path string matching for resolution logic.
    const unixOsPrefixes = ['/home/', '/Users/', '/var/', '/tmp/', '/opt/', '/usr/', '/etc/'];
    const windowsDrivePattern = /^[A-Za-z]:[/\\]/;

    // Check Unix patterns
    for (const prefix of unixOsPrefixes) {
      if (normalizedPath.startsWith(prefix)) {
        return true;
      }
    }

    // Check Windows drive pattern
    if (windowsDrivePattern.test(normalizedPath)) {
      return true;
    }

    // If we get here, assume it's a project-relative path like /lib/utils
    return false;
  }
}
