/**
 * CompilationErrorAggregator Tests
 * Following AGENTS.md: "Test failure modes, not just happy paths"
 */

import { CompilationErrorAggregator, CompilationError } from '../src/error-aggregator';

describe('CompilationErrorAggregator', () => {
  let aggregator: CompilationErrorAggregator;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    aggregator = new CompilationErrorAggregator();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Error Collection', () => {
    test('should collect errors', () => {
      const error: CompilationError = {
        file: 'test.som',
        line: 10,
        column: 5,
        code: 'SYNTAX_ERROR',
        message: 'Expected semicolon',
        severity: 'error',
      };

      aggregator.collect(error);

      expect(aggregator.getErrorCount()).toBe(1);
      expect(aggregator.hasErrors()).toBe(true);
    });

    test('should collect warnings separately from errors', () => {
      const error: CompilationError = {
        file: 'test.som',
        code: 'ERROR',
        message: 'Error message',
        severity: 'error',
      };

      const warning: CompilationError = {
        file: 'test.som',
        code: 'WARNING',
        message: 'Warning message',
        severity: 'warning',
      };

      aggregator.collect(error);
      aggregator.collect(warning);

      expect(aggregator.getErrorCount()).toBe(1);
      expect(aggregator.getWarningCount()).toBe(1);
    });

    test('should collect multiple errors', () => {
      for (let i = 0; i < 10; i++) {
        aggregator.collect({
          file: 'test.som',
          line: i,
          code: 'ERROR',
          message: `Error ${i}`,
          severity: 'error',
        });
      }

      expect(aggregator.getErrorCount()).toBe(10);
    });

    test('should respect max error limit to prevent memory explosion', () => {
      // Collect 150 errors (max is 100)
      for (let i = 0; i < 150; i++) {
        aggregator.collect({
          file: 'test.som',
          code: 'ERROR',
          message: `Error ${i}`,
          severity: 'error',
        });
      }

      expect(aggregator.getErrorCount()).toBe(100);
      expect(aggregator.shouldStop()).toBe(true);
    });

    test('should not limit warnings', () => {
      for (let i = 0; i < 150; i++) {
        aggregator.collect({
          file: 'test.som',
          code: 'WARNING',
          message: `Warning ${i}`,
          severity: 'warning',
        });
      }

      expect(aggregator.getWarningCount()).toBe(150);
    });
  });

  describe('Error Reporting', () => {
    test('should report errors with file grouping', () => {
      aggregator.collect({
        file: 'file1.som',
        line: 10,
        column: 5,
        code: 'SYNTAX_ERROR',
        message: 'Expected semicolon',
        severity: 'error',
      });

      aggregator.collect({
        file: 'file2.som',
        line: 20,
        code: 'TYPE_MISMATCH',
        message: 'Type mismatch',
        severity: 'error',
      });

      aggregator.reportAll();

      expect(consoleErrorSpy).toHaveBeenCalledWith('\n📋 COMPILATION SUMMARY\n');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Found 2 error(s)'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('file1.som'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('file2.som'));
    });

    test('should report warnings', () => {
      aggregator.collect({
        file: 'test.som',
        code: 'UNUSED_VAR',
        message: 'Unused variable',
        severity: 'warning',
      });

      aggregator.reportAll();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('1 warning(s)'));
    });

    test('should include suggestions when available', () => {
      aggregator.collect({
        file: 'test.som',
        line: 10,
        code: 'SYNTAX_ERROR',
        message: 'Parse error',
        severity: 'error',
        suggestion: 'Add missing semicolon',
      });

      aggregator.reportAll();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('💡 Suggestion: Add missing semicolon')
      );
    });

    test('should display error limit warning when limit reached', () => {
      for (let i = 0; i < 100; i++) {
        aggregator.collect({
          file: 'test.som',
          code: 'ERROR',
          message: `Error ${i}`,
          severity: 'error',
        });
      }

      aggregator.reportAll();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error limit reached. There may be more errors')
      );
    });

    test('should not report anything when no errors or warnings', () => {
      aggregator.reportAll();

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    test('should format location correctly with line and column', () => {
      aggregator.collect({
        file: 'test.som',
        line: 15,
        column: 8,
        code: 'ERROR',
        message: 'Test error',
        severity: 'error',
      });

      aggregator.reportAll();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Line :15:8'));
    });

    test('should format location correctly with line only', () => {
      aggregator.collect({
        file: 'test.som',
        line: 15,
        code: 'ERROR',
        message: 'Test error',
        severity: 'error',
      });

      aggregator.reportAll();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Line :15'));
    });

    test('should handle missing file gracefully', () => {
      aggregator.collect({
        file: '',
        code: 'ERROR',
        message: 'Test error',
        severity: 'error',
      });

      aggregator.reportAll();

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should sort errors by line number within each file', () => {
      aggregator.collect({
        file: 'test.som',
        line: 30,
        code: 'ERROR',
        message: 'Error 3',
        severity: 'error',
      });

      aggregator.collect({
        file: 'test.som',
        line: 10,
        code: 'ERROR',
        message: 'Error 1',
        severity: 'error',
      });

      aggregator.collect({
        file: 'test.som',
        line: 20,
        code: 'ERROR',
        message: 'Error 2',
        severity: 'error',
      });

      aggregator.reportAll();

      const calls = consoleErrorSpy.mock.calls.map(call => call[0]);
      const errorMessages = calls.filter((msg: string) => msg.includes('Error'));

      // Find indices to verify order
      const error1Index = errorMessages.findIndex((msg: string) => msg.includes('Error 1'));
      const error2Index = errorMessages.findIndex((msg: string) => msg.includes('Error 2'));
      const error3Index = errorMessages.findIndex((msg: string) => msg.includes('Error 3'));

      expect(error1Index).toBeLessThan(error2Index);
      expect(error2Index).toBeLessThan(error3Index);
    });
  });

  describe('Fail Fast', () => {
    test('should exit with code 1 when errors exist', () => {
      let exitCode: number | undefined;
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
        exitCode = code;
        throw new Error(`Mocked exit with code ${code}`); // Prevent continued execution
      }) as never);

      aggregator.collect({
        file: 'test.som',
        code: 'ERROR',
        message: 'Test error',
        severity: 'error',
      });

      expect(aggregator.hasErrors()).toBe(true);
      expect(aggregator.getErrorCount()).toBe(1);

      expect(() => {
        aggregator.failFast();
      }).toThrow('Mocked exit with code 1');

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(exitCode).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Compilation failed with 1 error(s)')
      );

      exitSpy.mockRestore();
    });

    test('should throw error when failFast called without errors', () => {
      expect(() => {
        aggregator.failFast();
      }).toThrow('failFast called without errors');
    });

    test('should report all errors before exiting', () => {
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
        throw new Error(`Mocked exit with code ${code}`);
      }) as never);

      aggregator.collect({
        file: 'test.som',
        code: 'ERROR1',
        message: 'Error 1',
        severity: 'error',
      });

      aggregator.collect({
        file: 'test.som',
        code: 'ERROR2',
        message: 'Error 2',
        severity: 'error',
      });

      expect(() => {
        aggregator.failFast();
      }).toThrow('Mocked exit with code 1');

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Found 2 error(s)'));

      exitSpy.mockRestore();
    });
  });

  describe('State Management', () => {
    test('should check if should stop collecting errors', () => {
      expect(aggregator.shouldStop()).toBe(false);

      for (let i = 0; i < 100; i++) {
        aggregator.collect({
          file: 'test.som',
          code: 'ERROR',
          message: `Error ${i}`,
          severity: 'error',
        });
      }

      expect(aggregator.shouldStop()).toBe(true);
    });

    test('should clear all errors and warnings', () => {
      aggregator.collect({
        file: 'test.som',
        code: 'ERROR',
        message: 'Error',
        severity: 'error',
      });

      aggregator.collect({
        file: 'test.som',
        code: 'WARNING',
        message: 'Warning',
        severity: 'warning',
      });

      expect(aggregator.getErrorCount()).toBe(1);
      expect(aggregator.getWarningCount()).toBe(1);

      aggregator.clear();

      expect(aggregator.getErrorCount()).toBe(0);
      expect(aggregator.getWarningCount()).toBe(0);
      expect(aggregator.hasErrors()).toBe(false);
    });

    test('should report zero errors after clear', () => {
      aggregator.collect({
        file: 'test.som',
        code: 'ERROR',
        message: 'Error',
        severity: 'error',
      });

      aggregator.clear();
      aggregator.reportAll();

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Static Suggestions', () => {
    test('should provide suggestion for known error codes', () => {
      expect(CompilationErrorAggregator.getSuggestion('CIRCULAR_DEP')).toBe(
        'Refactor to remove circular dependency or use dynamic imports'
      );

      expect(CompilationErrorAggregator.getSuggestion('UNDEFINED_VAR')).toBe(
        'Check variable name spelling or ensure it is declared'
      );

      expect(CompilationErrorAggregator.getSuggestion('TYPE_MISMATCH')).toBe(
        'Ensure types match or add explicit type conversion'
      );

      expect(CompilationErrorAggregator.getSuggestion('MISSING_MODULE')).toBe(
        'Run npm install or check the module path'
      );

      expect(CompilationErrorAggregator.getSuggestion('SYNTAX_ERROR')).toBe(
        'Check for missing semicolons, brackets, or quotes'
      );

      expect(CompilationErrorAggregator.getSuggestion('PERMISSION_DENIED')).toBe(
        'Check file permissions or run with appropriate privileges'
      );
    });

    test('should return undefined for unknown error codes', () => {
      expect(CompilationErrorAggregator.getSuggestion('UNKNOWN_ERROR')).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle errors without line numbers', () => {
      aggregator.collect({
        file: 'test.som',
        code: 'ERROR',
        message: 'Generic error',
        severity: 'error',
      });

      aggregator.reportAll();

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('should handle multiple files with same name', () => {
      aggregator.collect({
        file: 'test.som',
        line: 10,
        code: 'ERROR1',
        message: 'Error 1',
        severity: 'error',
      });

      aggregator.collect({
        file: 'test.som',
        line: 20,
        code: 'ERROR2',
        message: 'Error 2',
        severity: 'error',
      });

      aggregator.reportAll();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('test.som'));
    });

    test('should handle empty file names', () => {
      aggregator.collect({
        file: '',
        code: 'ERROR',
        message: 'Error',
        severity: 'error',
      });

      aggregator.reportAll();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('unknown'));
    });

    test('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000);

      aggregator.collect({
        file: 'test.som',
        code: 'ERROR',
        message: longMessage,
        severity: 'error',
      });

      aggregator.reportAll();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(longMessage));
    });

    test('should handle special characters in messages', () => {
      aggregator.collect({
        file: 'test.som',
        code: 'ERROR',
        message: 'Error with "quotes" and <brackets>',
        severity: 'error',
      });

      aggregator.reportAll();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error with "quotes" and <brackets>')
      );
    });

    test('should handle Unicode in error messages', () => {
      aggregator.collect({
        file: 'тест.som',
        code: 'ERROR',
        message: 'Хатогӣ дар сатр',
        severity: 'error',
      });

      aggregator.reportAll();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Хатогӣ дар сатр'));
    });
  });

  describe('Performance and Memory', () => {
    test('should not consume excessive memory with many errors', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Try to add 1000 errors, but only 100 should be stored
      for (let i = 0; i < 1000; i++) {
        aggregator.collect({
          file: `file${i}.som`,
          line: i,
          code: 'ERROR',
          message: `Error ${i}`,
          severity: 'error',
        });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB for 100 errors)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      expect(aggregator.getErrorCount()).toBe(100);
    });

    test('should handle rapid collection efficiently', () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        aggregator.collect({
          file: 'test.som',
          code: 'ERROR',
          message: `Error ${i}`,
          severity: 'error',
        });
      }

      const duration = Date.now() - start;

      // Should complete in less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
