/**
 * Production Environment Validator
 * Implements AGENTS.md principle: "Fail fast, fail clearly"
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ValidationError {
  category: 'environment' | 'permissions' | 'configuration';
  message: string;
  details?: Record<string, unknown>;
}

export class ProductionValidator {
  private errors: ValidationError[] = [];

  /**
   * Validate entire production environment
   * Fails fast with clear, actionable errors
   */
  public validate(options: {
    outputPath?: string;
    requiredPaths?: string[];
    isProduction: boolean;
  }): void {
    if (!options.isProduction) {
      return; // Skip validation in development
    }

    this.errors = [];

    // Check Node.js version
    this.validateNodeVersion();

    // Check write permissions
    if (options.outputPath) {
      this.validateWritePermission(options.outputPath);
    }

    // Check required paths exist
    if (options.requiredPaths) {
      this.validateRequiredPaths(options.requiredPaths);
    }

    // Check system resources
    this.validateSystemResources();

    // FAIL FAST if any errors
    if (this.errors.length > 0) {
      this.failFast();
    }
  }

  private validateNodeVersion(): void {
    const version = process.versions.node;
    const major = parseInt(version.split('.')[0], 10);

    if (major !== 20 && major !== 22 && major !== 23 && major !== 24) {
      this.errors.push({
        category: 'environment',
        message: `Invalid Node.js version: ${version}. Production requires Node.js 20.x, 22.x, 23.x, or 24.x`,
        details: { current: version, required: ['20.x', '22.x', '23.x', '24.x'] },
      });
    }
  }

  private validateWritePermission(outputPath: string): void {
    const dir = path.dirname(outputPath);

    try {
      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Try to create a test file
      const testFile = path.join(dir, `.somon-write-test-${Date.now()}`);
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (error: unknown) {
      const errorCode =
        error instanceof Error && 'code' in error
          ? (error as Error & { code?: string }).code
          : undefined;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.errors.push({
        category: 'permissions',
        message: `No write permission for output directory: ${dir}`,
        details: {
          path: dir,
          error: errorCode || errorMessage,
        },
      });
    }
  }

  private validateRequiredPaths(paths: string[]): void {
    for (const requiredPath of paths) {
      if (!fs.existsSync(requiredPath)) {
        this.errors.push({
          category: 'configuration',
          message: `Required path does not exist: ${requiredPath}`,
          details: { path: requiredPath },
        });
      }
    }
  }

  private validateSystemResources(): void {
    const memoryUsage = process.memoryUsage();
    // Check total heap size instead of available (Node can grow heap dynamically)
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const minRequiredHeap = 50; // 50MB minimum heap total

    if (heapTotalMB < minRequiredHeap) {
      this.errors.push({
        category: 'environment',
        message: 'Insufficient memory available',
        details: {
          heapTotal: `${heapTotalMB}MB`,
          required: `${minRequiredHeap}MB minimum`,
        },
      });
    }
  }

  private failFast(): never {
    console.error('\n🚨 PRODUCTION VALIDATION FAILED\n');
    console.error('The following critical issues prevent running in production mode:\n');

    for (const error of this.errors) {
      console.error(`❌ [${error.category.toUpperCase()}] ${error.message}`);
      if (error.details) {
        console.error('   Details:', JSON.stringify(error.details, null, 2));
      }
    }

    console.error('\nPlease fix these issues before running in production mode.');
    console.error('Run without --production flag for development mode.\n');

    process.exit(1);
  }
}
