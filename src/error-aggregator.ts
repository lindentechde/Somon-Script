/**
 * Compilation Error Aggregator
 * Implements AGENTS.md principle: "Collect ALL errors before reporting"
 */

export interface CompilationError {
  file: string;
  line?: number;
  column?: number;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export class CompilationErrorAggregator {
  private errors: CompilationError[] = [];
  private warnings: CompilationError[] = [];
  private maxErrors = 100; // Prevent memory explosion

  /**
   * Collect an error or warning
   * Does NOT fail immediately - aggregates for later reporting
   */
  public collect(error: CompilationError): void {
    if (error.severity === 'warning') {
      this.warnings.push(error);
    } else {
      if (this.errors.length < this.maxErrors) {
        this.errors.push(error);
      }
    }
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
    if (this.errors.length === 0 && this.warnings.length === 0) {
      return;
    }

    console.error('\n📋 COMPILATION SUMMARY\n');

    // Report errors
    if (this.errors.length > 0) {
      console.error(`Found ${this.errors.length} error(s):\n`);

      // Group errors by file
      const errorsByFile = this.groupByFile(this.errors);

      for (const [file, fileErrors] of errorsByFile.entries()) {
        console.error(`\n📄 ${file}:`);

        for (const error of fileErrors) {
          const location = error.line
            ? `:${error.line}${error.column ? `:${error.column}` : ''}`
            : '';

          console.error(`  ❌ [${error.code}] Line ${location}`);
          console.error(`     ${error.message}`);

          if (error.suggestion) {
            console.error(`     💡 Suggestion: ${error.suggestion}`);
          }
        }
      }

      if (this.errors.length >= this.maxErrors) {
        console.error(`\n⚠️  Error limit reached. There may be more errors.`);
      }
    }

    // Report warnings
    if (this.warnings.length > 0) {
      console.error(`\n⚠️  ${this.warnings.length} warning(s):`);

      const warningsByFile = this.groupByFile(this.warnings);

      for (const [file, fileWarnings] of warningsByFile.entries()) {
        console.error(`\n📄 ${file}:`);

        for (const warning of fileWarnings) {
          console.error(`  ⚠️  ${warning.message}`);
        }
      }
    }

    console.error('\n');
  }

  /**
   * Fail fast with comprehensive error reporting
   */
  public failFast(): never {
    this.reportAll();

    if (this.errors.length > 0) {
      console.error(`❌ Compilation failed with ${this.errors.length} error(s)\n`);
      process.exit(1);
    }

    throw new Error('failFast called without errors');
  }

  /**
   * Get error count
   */
  public getErrorCount(): number {
    return this.errors.length;
  }

  /**
   * Get warning count
   */
  public getWarningCount(): number {
    return this.warnings.length;
  }

  /**
   * Check if there are any errors
   */
  public hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Clear all collected errors and warnings
   */
  public clear(): void {
    this.errors = [];
    this.warnings = [];
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
    };

    return suggestions[code];
  }
}
