// Module System - Complete implementation for SomonScript
// Системаи модулҳо - Татбиқи пурра барои SomonScript

export { ModuleResolver } from './module-resolver';
export type { ModuleResolutionOptions, ResolvedModule } from './module-resolver';
export { ModuleLoader } from './module-loader';
export type { LoadedModule, ModuleExports, ModuleLoadOptions } from './module-loader';
export { ModuleRegistry } from './module-registry';
export type { ModuleMetadata, ModuleImports, DependencyNode } from './module-registry';
export { ModuleSystem } from './module-system';
export type {
  ModuleSystemOptions,
  CompiledModule,
  CompilationResult,
  BundleOptions,
  BundleOutput,
  ModuleSystemWatchOptions,
  ModuleWatchEvent,
  ModuleWatchEventType,
} from './module-system';

// Production utilities
export { SignalHandler } from './signal-handler';
export type { ShutdownHandler, SignalHandlerOptions } from './signal-handler';
export { ResourceLimiter } from './resource-limiter';
export type { ResourceLimits, ResourceUsage, ResourceWarningCallback } from './resource-limiter';
export {
  withTimeout,
  createTimeoutWrapper,
  allWithTimeout,
  TimeoutError,
  AggregateTimeoutError,
} from './async-timeout';
export type { TimeoutOptions } from './async-timeout';
export { Logger, LoggerFactory, PerformanceTrace } from './logger';
export type { LogLevel, LogEntry, LoggerConfig } from './logger';
