/**
 * Production-grade Error Aggregator
 * Implements AGENTS.md principles:
 * - "Collect ALL errors before reporting"
 * - "Fail fast, fail clearly"
 * - "Report errors clearly with context"
 */

export interface CompilationError {
  file: string;
  line?: number;
  column?: number;
  code: string;
  message: string;
  severity: 'critical' | 'error' | 'warning';
  category: 'syntax' | 'type' | 'resolution' | 'system' | 'validation' | 'runtime' | 'unknown';
  suggestion?: string;
  timestamp?: number;
  stack?: string;
}

export class CompilationErrorAggregator {
  private errors: CompilationError[] = [];
  private warnings: CompilationError[] = [];
  private criticalErrors: CompilationError[] = [];
  private maxErrors = 100; // Prevent memory explosion
  private failFastOnCritical = true;

  /**
   * Collect an error or warning with automatic categorization
   * Does NOT fail immediately - aggregates for later reporting
   * EXCEPT for critical errors when failFastOnCritical is enabled
   */
  public collect(error: CompilationError): void {
    // Add timestamp if not present
    if (!error.timestamp) {
      error.timestamp = Date.now();
    }

    // Auto-categorize if not set
    if (error.category === 'unknown') {
      error.category = this.categorizeError(error);
    }

    if (error.severity === 'critical') {
      this.criticalErrors.push(error);
      // Fail fast on critical errors
      if (this.failFastOnCritical) {
        this.reportAll();
        this.failFast();
      }
    } else if (error.severity === 'warning') {
      this.warnings.push(error);
    } else {
      if (this.errors.length < this.maxErrors) {
        this.errors.push(error);
      }
    }
  }

  /**
   * Automatically categorize error based on message and code
   */
  private categorizeError(error: CompilationError): CompilationError['category'] {
    const message = error.message.toLowerCase();
    const code = error.code.toLowerCase();

    if (code.includes('syntax') || message.includes('syntax')) return 'syntax';
    if (code.includes('type') || message.includes('type')) return 'type';
    if (code.includes('resolution') || code.includes('module') || message.includes('not found'))
      return 'resolution';
    if (code.includes('permission') || code.includes('eacces')) return 'system';
    if (code.includes('validation') || message.includes('invalid')) return 'validation';
    if (code.includes('runtime')) return 'runtime';

    return 'unknown';
  }

  /**
   * Check if compilation should stop
   */
  public shouldStop(): boolean {
    return this.errors.length >= this.maxErrors;
  }

  /**
   * Report all collected errors and warnings
   * Provides comprehensive context for debugging
   */
  public reportAll(): void {
    const totalIssues = this.criticalErrors.length + this.errors.length + this.warnings.length;
    if (totalIssues === 0) {
      return;
    }

    console.error('\n╔═══════════════════════════════════════════════════════════════╗');
    console.error('║            COMPILATION ERROR REPORT                           ║');
    console.error('╚═══════════════════════════════════════════════════════════════╝\n');

    // Summary
    console.error(`📊 Summary:`);
    console.error(`   Total issues: ${totalIssues}`);
    console.error(
      `   Critical: ${this.criticalErrors.length}, Errors: ${this.errors.length}, Warnings: ${this.warnings.length}`
    );

    // Category breakdown
    const byCategory = this.getErrorsByCategory();
    if (byCategory.size > 0) {
      console.error(
        `   By category: ${Array.from(byCategory.entries())
          .map(([cat, count]) => `${cat}=${count}`)
          .join(', ')}`
      );
    }
    console.error('');

    // Report critical errors first (these cause immediate failure)
    if (this.criticalErrors.length > 0) {
      console.error('🚨 CRITICAL ERRORS (System will exit):');
      const criticalByFile = this.groupByFile(this.criticalErrors);

      for (const [file, fileErrors] of criticalByFile.entries()) {
        console.error(`\n📄 ${file}:`);
        for (const error of fileErrors) {
          this.reportSingleError(error, '🚨');
        }
      }
      console.error('');
    }

    // Report errors
    if (this.errors.length > 0) {
      console.error(`❌ ERRORS (${this.errors.length}):`);
      const errorsByFile = this.groupByFile(this.errors);

      for (const [file, fileErrors] of errorsByFile.entries()) {
        console.error(`\n📄 ${file}:`);
        for (const error of fileErrors) {
          this.reportSingleError(error, '❌');
        }
      }

      if (this.errors.length >= this.maxErrors) {
        console.error(`\n⚠️  Error limit reached. There may be more errors.`);
      }
      console.error('');
    }

    // Report warnings
    if (this.warnings.length > 0) {
      console.error(`⚠️  WARNINGS (${this.warnings.length}):`);
      const warningsByFile = this.groupByFile(this.warnings);

      for (const [file, fileWarnings] of warningsByFile.entries()) {
        console.error(`\n📄 ${file}:`);
        for (const warning of fileWarnings) {
          this.reportSingleError(warning, '⚠️ ');
        }
      }
      console.error('');
    }

    console.error('╔═══════════════════════════════════════════════════════════════╗');
    console.error('║            END OF ERROR REPORT                                ║');
    console.error('╚═══════════════════════════════════════════════════════════════╝\n');
  }

  /**
   * Report a single error with formatting
   */
  private reportSingleError(error: CompilationError, icon: string): void {
    const location = error.line ? `:${error.line}${error.column ? `:${error.column}` : ''}` : '';

    console.error(`  ${icon} [${error.code}]${location ? ` Line ${location}` : ''}`);
    console.error(`     ${error.message}`);

    if (error.category !== 'unknown') {
      console.error(`     Category: ${error.category}`);
    }

    if (error.suggestion) {
      console.error(`     💡 Suggestion: ${error.suggestion}`);
    }

    if (error.stack && process.env.DEBUG) {
      console.error(`     Stack: ${error.stack.split('\n')[0]}`);
    }
  }

  /**
   * Get errors grouped by category
   */
  private getErrorsByCategory(): Map<string, number> {
    const byCategory = new Map<string, number>();
    const allErrors = [...this.criticalErrors, ...this.errors, ...this.warnings];

    for (const error of allErrors) {
      const count = byCategory.get(error.category) || 0;
      byCategory.set(error.category, count + 1);
    }

    return byCategory;
  }

  /**
   * Fail fast with comprehensive error reporting
   * Implements proper exit codes based on error severity
   */
  public failFast(): never {
    this.reportAll();

    if (this.criticalErrors.length > 0) {
      console.error(
        `💥 Exiting due to ${this.criticalErrors.length} critical error(s). System cannot continue.\n`
      );
      process.exit(2); // Critical failure
    }

    if (this.errors.length > 0) {
      console.error(
        `❌ Compilation failed with ${this.errors.length} error(s). Please fix and retry.\n`
      );
      process.exit(1); // Standard failure
    }

    // No errors - should not be called
    throw new Error('failFast called without errors');
  }

  /**
   * Get error count
   */
  public getErrorCount(): number {
    return this.errors.length;
  }

  /**
   * Get critical error count
   */
  public getCriticalErrorCount(): number {
    return this.criticalErrors.length;
  }

  /**
   * Get warning count
   */
  public getWarningCount(): number {
    return this.warnings.length;
  }

  /**
   * Get total issue count
   */
  public getTotalCount(): number {
    return this.criticalErrors.length + this.errors.length + this.warnings.length;
  }

  /**
   * Check if there are any errors
   */
  public hasErrors(): boolean {
    return this.errors.length > 0 || this.criticalErrors.length > 0;
  }

  /**
   * Check if there are any critical errors
   */
  public hasCriticalErrors(): boolean {
    return this.criticalErrors.length > 0;
  }

  /**
   * Clear all collected errors and warnings
   */
  public clear(): void {
    this.errors = [];
    this.warnings = [];
    this.criticalErrors = [];
  }

  /**
   * Set whether to fail fast on critical errors
   */
  public setFailFastOnCritical(enabled: boolean): void {
    this.failFastOnCritical = enabled;
  }

  /**
   * Get all errors (critical, errors, warnings)
   */
  public getAllErrors(): CompilationError[] {
    return [...this.criticalErrors, ...this.errors, ...this.warnings];
  }

  private groupByFile(items: CompilationError[]): Map<string, CompilationError[]> {
    const grouped = new Map<string, CompilationError[]>();

    for (const item of items) {
      const file = item.file || 'unknown';
      if (!grouped.has(file)) {
        grouped.set(file, []);
      }
      grouped.get(file)!.push(item);
    }

    // Sort by line number within each file
    for (const fileErrors of grouped.values()) {
      fileErrors.sort((a, b) => (a.line || 0) - (b.line || 0));
    }

    return grouped;
  }

  /**
   * Get common error suggestions
   */
  public static getSuggestion(code: string): string | undefined {
    const suggestions: Record<string, string> = {
      CIRCULAR_DEP: 'Refactor to remove circular dependency or use dynamic imports',
      UNDEFINED_VAR: 'Check variable name spelling or ensure it is declared',
      TYPE_MISMATCH: 'Ensure types match or add explicit type conversion',
      MISSING_MODULE: 'Run npm install or check the module path',
      SYNTAX_ERROR: 'Check for missing semicolons, brackets, or quotes',
      PERMISSION_DENIED: 'Check file permissions or run with appropriate privileges',
      EACCES: 'Permission denied - check file/directory permissions',
      ENOENT: 'File or directory not found - verify the path exists',
      NODE_VERSION: 'Upgrade Node.js to a supported version (20.x, 22.x, 23.x, 24.x)',
      VALIDATION_ERROR: 'Fix validation errors before running in production mode',
    };

    return suggestions[code];
  }

  /**
   * Create error from exception with auto-categorization
   */
  public static fromException(
    error: Error,
    file: string,
    code = 'UNKNOWN_ERROR'
  ): CompilationError {
    const message = error.message;
    let category: CompilationError['category'] = 'unknown';
    let severity: CompilationError['severity'] = 'error';

    // Auto-detect category from error message
    if (message.includes('EACCES') || message.includes('ENOENT')) {
      category = 'system';
      severity = 'critical';
    } else if (message.includes('syntax')) {
      category = 'syntax';
    } else if (message.includes('type')) {
      category = 'type';
    } else if (message.includes('not found') || message.includes('cannot find')) {
      category = 'resolution';
    } else if (message.includes('validation')) {
      category = 'validation';
      severity = 'critical';
    }

    return {
      file,
      code,
      message,
      severity,
      category,
      suggestion: this.getSuggestion(code),
      timestamp: Date.now(),
      stack: error.stack,
    };
  }
}

/**
 * Global error aggregator for CLI usage
 */
let globalAggregator: CompilationErrorAggregator | null = null;

/**
 * Get or create global error aggregator
 */
export function getGlobalErrorAggregator(): CompilationErrorAggregator {
  if (!globalAggregator) {
    globalAggregator = new CompilationErrorAggregator();
  }
  return globalAggregator;
}

/**
 * Reset global error aggregator
 */
export function resetGlobalErrorAggregator(): void {
  globalAggregator = null;
}
