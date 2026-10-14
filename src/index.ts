/*
 * SomonScript
 * Copyright (c) 2025 LindenTech IT Consulting
 *
 * Licensed under the MIT License. See the LICENSE file for details.
 */

/**
 * # SomonScript Compiler API
 *
 * SomonScript provides a localized programming language that compiles to modern JavaScript.
 * This entrypoint exposes a minimal, well-documented API for embedding the compiler in
 * build pipelines, CLIs, and editors.
 *
 * @example
 * ```ts
 * import { compile } from "jsr:@lindentechde/somon-script";
 *
 * const result = compile("чоп.сабт('Салом, ҷаҳон!');");
 * if (result.errors.length === 0) {
 *   console.log(result.code); // console.log("Салом, ҷаҳон!");
 * }
 * ```
 */
export { compile } from './compiler';
export type { CompileOptions, CompileResult } from './compiler';
// Diagnostics in the learner's language (`compile(source, { language })`)
export { formatDiagnostic, formatFailure } from './diagnostics';
export type { Diagnostic, DiagnosticLanguage } from './diagnostics';
export { TARGETS, DEFAULT_TARGET, BUNDLE_FORMATS, defaultLib, typeScriptLibNames } from './targets';
export type { Target, BundleFormat } from './targets';

// Developer tools: formatter, TypeScript migration and REPL
export { format, FormatError } from './tools/format';
export type { FormatOptions } from './tools/format';
export { migrate, MigrateError } from './tools/migrate';
export type { MigrateOptions, MigrateResult, MigrateWarning } from './tools/migrate';
export { Repl } from './tools/repl';
export type { ReplOptions, ReplMessages } from './tools/repl';

// Module system and bundler (docs/module-system.md)
export {
  BundleError,
  ModuleSystem,
  ModuleResolver,
  ModuleLoader,
  ModuleLoadError,
  ModuleRegistry,
  withTimeout,
  createTimeoutWrapper,
  allWithTimeout,
  TimeoutError,
  AggregateTimeoutError,
} from './module-system';
export type {
  ModuleSystemOptions,
  CompiledModule,
  CompilationResult,
  CompilationError,
  CompilationWarning,
  BundleOptions,
  BundleOutput,
  ModuleResolutionOptions,
  ResolvedModule,
  LoadedModule,
  ModuleLoadOptions,
  ModuleMetadata,
  TimeoutOptions,
} from './module-system';
