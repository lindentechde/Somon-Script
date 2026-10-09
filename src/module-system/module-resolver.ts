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

/** Conditions of package.json "exports" that Node's `require()` matches. */
const REQUIRE_CONDITIONS: ReadonlySet<string> = new Set(['require', 'node', 'default']);
/**
 * The conditions of `import`: a package with ES module entries only is still a
 * dependency the host loads (an esm bundle imports it).
 */
const IMPORT_CONDITIONS: ReadonlySet<string> = new Set(['import', 'node', 'default']);

const UNIX_SYSTEM_PREFIXES = ['/home/', '/Users/', '/var/', '/tmp/', '/opt/', '/usr/', '/etc/']; // NOSONAR

/**
 * Whether a normalized absolute path names a place of the file system rather than
 * of the project (see `ModuleResolver`): a common Unix system directory, a Windows
 * drive (`C:\…`) or a UNC path (`\\server\share\…`, `\\?\C:\…`).
 * @internal
 */
export function isSystemPath(normalizedPath: string): boolean {
  return (
    UNIX_SYSTEM_PREFIXES.some(prefix => normalizedPath.startsWith(prefix)) ||
    /^[A-Za-z]:[/\\]/.test(normalizedPath) ||
    /^[/\\]{2}[^/\\]+[/\\]/.test(normalizedPath)
  );
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
    // A relative fromFile would make the node_modules walk stop at '.'
    fromFile = path.resolve(fromFile);

    // Determine a correct base directory whether 'fromFile' is a file path or a directory path
    let fromDir = path.dirname(fromFile);
    try {
      if (fs.statSync(fromFile).isDirectory()) {
        fromDir = fromFile;
      }
    } catch {
      // Not on disk: a file path
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
        // Like a relative import: extensions, index files and package.json "main" are tried
        return this.resolveFile(normalizedPath, false);
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
    // Relative imports with `..` are legitimate (sibling folders, parent-project code),
    // so we do not confine them to baseUrl. Absolute-path and package.json-main
    // traversal are handled separately in `resolveAbsolute` / `tryPackageJsonMain`.
    const targetPath = path.resolve(fromDir, specifier);
    return this.resolveFile(targetPath, false);
  }

  private resolveAbsolute(specifier: string): ResolvedModule {
    const targetPath = path.resolve(this.options.baseUrl, specifier.slice(1));
    this.assertInsideBaseUrl(targetPath, specifier);
    const resolved = this.resolveFile(targetPath, false);
    // Re-check with symlinks resolved so a link inside baseUrl cannot point outside it
    this.assertInsideBaseUrl(resolved.resolvedPath, specifier);
    return resolved;
  }

  private resolveMappedPath(specifier: string): ResolvedModule | null {
    for (const [pattern, mappings] of Object.entries(this.options.paths)) {
      if (this.matchesPattern(specifier, pattern)) {
        for (const mapping of mappings) {
          const mappedSpecifier = this.applyMapping(specifier, pattern, mapping);
          const targetPath = path.resolve(this.options.baseUrl, mappedSpecifier);
          if (!this.isInsideDir(targetPath, this.options.baseUrl)) {
            continue;
          }

          const resolved = this.tryResolveFile(targetPath);
          if (resolved && this.isInsideDir(resolved.resolvedPath, this.options.baseUrl)) {
            return resolved;
          }
        }
      }
    }
    return null;
  }

  private tryResolveFile(targetPath: string): ResolvedModule | null {
    try {
      return this.resolveFile(targetPath, false);
    } catch {
      return null;
    }
  }

  private resolveNodeModules(specifier: string, fromDir: string): ResolvedModule {
    // Bare specifiers name a package (and optional subpath); '..' would let them climb
    // out of the module directory, so they are rejected outright.
    if (specifier.split('/').includes('..')) {
      throw new Error(`Bare module specifier '${specifier}' must not contain '..' segments`);
    }

    const segments = specifier.split('/');
    const nameLength = specifier.startsWith('@') ? 2 : 1;
    const packageName = segments.slice(0, nameLength).join('/');
    const subpath = ['.', ...segments.slice(nameLength)].join('/');

    let currentDir = fromDir;
    for (;;) {
      for (const moduleDir of this.options.moduleDirectories) {
        const packageDir = path.join(currentDir, moduleDir, packageName);
        const fromExports = this.tryPackageExports(packageDir, packageName, subpath, specifier);
        if (fromExports) return fromExports;

        try {
          return this.resolveFile(path.join(currentDir, moduleDir, specifier), true, packageName);
        } catch {
          // Continue searching
        }
      }
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }

    throw new Error(`Module not found: ${specifier}`);
  }

  /**
   * Resolve `subpath` through the package.json "exports" field like Node's require():
   * string, array and conditional targets ("require", "node", "default") and
   * "./dir/*" patterns. A subpath exported for "import" only resolves to that ES
   * module. Returns null when the package has no "exports" field.
   */
  private tryPackageExports(
    packageDir: string,
    packageName: string,
    subpath: string,
    specifier: string
  ): ResolvedModule | null {
    const packageJsonPath = path.join(packageDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }
    const exportsField = this.readPackageJson(packageJsonPath).exports;
    if (exportsField === undefined || exportsField === null) {
      return null;
    }

    const isSubpathMap =
      typeof exportsField === 'object' &&
      !Array.isArray(exportsField) &&
      Object.keys(exportsField).some(key => key.startsWith('.'));

    const targetFor = (conditions: ReadonlySet<string>): string | null => {
      if (!isSubpathMap) {
        return subpath === '.' ? this.resolveExportsTarget(exportsField, conditions) : null;
      }
      return this.matchExportsSubpath(exportsField as Record<string, unknown>, subpath, conditions);
    };
    const target = targetFor(REQUIRE_CONDITIONS) ?? targetFor(IMPORT_CONDITIONS);

    if (target === null || !target.startsWith('./')) {
      throw new Error(
        `Package subpath '${subpath}' is not exported by ${packageJsonPath} (importing '${specifier}')`
      );
    }

    const targetPath = path.resolve(packageDir, target);
    if (!this.isInsideDir(targetPath, packageDir)) {
      throw new Error(`package.json 'exports' target escapes package directory: ${target}`);
    }
    const resolved = this.tryExactPath(targetPath, true, packageName);
    if (!resolved) {
      throw new Error(`Cannot resolve module: ${targetPath} (exported by ${packageJsonPath})`);
    }
    return resolved;
  }

  private matchExportsSubpath(
    map: Record<string, unknown>,
    subpath: string,
    conditions: ReadonlySet<string>
  ): string | null {
    if (Object.prototype.hasOwnProperty.call(map, subpath)) {
      return this.resolveExportsTarget(map[subpath], conditions);
    }

    // Longest matching "./prefix*suffix" pattern wins
    const patterns = Object.keys(map)
      .filter(key => key.split('*').length === 2)
      .sort((a, b) => b.indexOf('*') - a.indexOf('*'));
    for (const key of patterns) {
      const [prefix, suffix] = key.split('*');
      if (
        subpath.startsWith(prefix) &&
        subpath.endsWith(suffix) &&
        subpath.length >= prefix.length + suffix.length
      ) {
        const match = subpath.slice(prefix.length, subpath.length - suffix.length);
        return this.resolveExportsTarget(map[key], conditions, match);
      }
    }
    return null;
  }

  private resolveExportsTarget(
    target: unknown,
    conditions: ReadonlySet<string>,
    patternMatch?: string
  ): string | null {
    if (typeof target === 'string') {
      return patternMatch === undefined ? target : target.split('*').join(patternMatch);
    }
    if (Array.isArray(target)) {
      for (const item of target) {
        const resolved = this.resolveExportsTarget(item, conditions, patternMatch);
        if (resolved !== null) return resolved;
      }
      return null;
    }
    if (target && typeof target === 'object') {
      for (const [condition, value] of Object.entries(target)) {
        if (conditions.has(condition)) {
          const resolved = this.resolveExportsTarget(value, conditions, patternMatch);
          if (resolved !== null) return resolved;
        }
      }
    }
    return null;
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

    // Like Node, a "main" that is not a string is ignored
    const { main } = this.readPackageJson(packageJsonPath);
    if (typeof main === 'string' && main.length > 0) {
      const mainPath = path.resolve(targetPath, main);
      // Confine package main to its own directory — reject "main": "../../etc/passwd"
      if (!this.isInsideDir(mainPath, targetPath)) {
        throw new Error(`package.json 'main' field escapes package directory: ${main}`);
      }
      const resolved = this.resolveFile(mainPath, isExternal, packageName);
      if (!this.isInsideDir(resolved.resolvedPath, targetPath)) {
        throw new Error(`package.json 'main' field escapes package directory: ${main}`);
      }
      return resolved;
    }

    return null;
  }

  /** The fields of a package.json; an unreadable file is an error that names it. */
  private readPackageJson(packageJsonPath: string): { main?: unknown; exports?: unknown } {
    let packageJson: unknown;
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    } catch (error) {
      throw new Error(`Invalid package.json ${packageJsonPath}: ${(error as Error).message}`);
    }
    if (typeof packageJson !== 'object' || packageJson === null || Array.isArray(packageJson)) {
      throw new Error(`Invalid package.json ${packageJsonPath}: it must contain a JSON object`);
    }
    return packageJson;
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

  /** `*`, `prefix/*` (the prefix with its '/') or an exact name, as in TypeScript. */
  private matchesPattern(specifier: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith('/*')) {
      return specifier.startsWith(pattern.slice(0, -1));
    }
    return specifier === pattern;
  }

  private applyMapping(specifier: string, pattern: string, mapping: string): string {
    if (pattern === '*') {
      return mapping.replace('*', specifier);
    }
    if (pattern.endsWith('/*')) {
      // What the '*' of `prefix/*` matched
      return mapping.replace('*', specifier.slice(pattern.length - 1));
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
   * Classify an absolute import specifier. Absolute imports are allowed: a path inside
   * baseUrl or under a common system prefix (/home/, /tmp/, C:\, \\server\share\ …) is used as-is;
   * anything else (e.g. /lib/utils) is project-relative, resolved against baseUrl and
   * confined to it.
   *
   * Containment policy of the resolver: project-relative absolute imports, `paths`
   * mappings and package.json "main"/"exports" targets must stay inside their root
   * (checked after resolving symlinks); bare specifiers must not contain '..'.
   * Relative imports (`./`, `../`) and OS-absolute imports are not confined —
   * SomonScript sources are trusted code.
   */
  private isOsLevelAbsolutePath(normalizedPath: string): boolean {
    return isSystemPath(normalizedPath) || this.isInsideDir(normalizedPath, this.options.baseUrl);
  }

  /**
   * Return true if `candidate` is equal to, or inside, `directory`. Both are resolved,
   * and symlinks are followed for the parts that exist, so a link cannot be used to
   * leave the directory. Comparison is separator-aware ('/proj-evil' is not in '/proj').
   */
  private isInsideDir(candidate: string, directory: string): boolean {
    const resolvedCandidate = this.realpathOrResolve(candidate);
    const resolvedDir = this.realpathOrResolve(directory);
    if (resolvedCandidate === resolvedDir) return true;
    const withSep = resolvedDir.endsWith(path.sep) ? resolvedDir : resolvedDir + path.sep;
    return resolvedCandidate.startsWith(withSep);
  }

  private realpathOrResolve(target: string): string {
    const resolved = path.resolve(target);
    try {
      return fs.realpathSync.native(resolved);
    } catch {
      // Not on disk (yet): resolve the deepest existing ancestor and append the rest
      const parent = path.dirname(resolved);
      if (parent === resolved) return resolved;
      return path.join(this.realpathOrResolve(parent), path.basename(resolved));
    }
  }

  /**
   * Assert that a project-relative absolute import stays inside baseUrl.
   */
  private assertInsideBaseUrl(absolutePath: string, specifier: string): void {
    if (!this.isInsideDir(absolutePath, this.options.baseUrl)) {
      throw new Error(
        `Module specifier '${specifier}' resolves outside baseUrl '${this.options.baseUrl}'. ` +
          `Project-relative absolute imports must stay inside the project tree.`
      );
    }
  }
}
