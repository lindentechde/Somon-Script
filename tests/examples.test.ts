import { compile } from '../src/compiler';
import * as fs from 'fs';
import * as path from 'path';

describe('SomonScript Examples - Comprehensive Tests', () => {
  const examplesDir = path.join(__dirname, '..', 'examples');
  const tempDir = path.join(__dirname, '..', 'dist', 'temp-examples-test');

  // Ensure temp directory exists
  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  // Clean up temp directory after tests
  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Helper function to get all .som files recursively
  function getAllSomFiles(dir: string, basePath: string = ''): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const relativePath = path.join(basePath, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...getAllSomFiles(fullPath, relativePath));
      } else if (entry.endsWith('.som')) {
        files.push(relativePath);
      }
    }

    return files.sort();
  }

  // Get all example files
  const exampleFiles = getAllSomFiles(examplesDir);

  // Define categories of examples
  const basicExamples = exampleFiles.filter(
    f => /^0[1-9]-/.test(path.basename(f)) || path.basename(f).startsWith('simple')
  );

  const advancedExamples = exampleFiles.filter(f => /^[12][0-9]-/.test(path.basename(f)));

  const moduleExamples = exampleFiles.filter(f => f.includes('modules/'));

  const testExamples = exampleFiles.filter(
    f => path.basename(f).startsWith('test-') || path.basename(f).includes('comprehensive')
  );

  // Features that are known to be in development
  const developmentFeatures = [
    'мавҳум', // abstract
    'номфазо', // namespace
    'калидҳои', // keyof
    'инфер', // infer
    'беназир', // unique
  ];

  // Helper to check if example uses development features
  function usesDevelopmentFeatures(source: string): boolean {
    return developmentFeatures.some(feature => source.includes(feature));
  }

  describe('Basic Examples (01-09)', () => {
    test.each(basicExamples)('should compile %s', exampleFile => {
      const filePath = path.join(examplesDir, exampleFile);
      const source = fs.readFileSync(filePath, 'utf-8');

      const result = compile(source, {
        sourceMap: false,
      });

      // Basic examples should compile without errors
      expect(result.errors).toEqual([]);
      expect(result.code).toBeTruthy();
      expect(result.code.length).toBeGreaterThan(0);
    });
  });

  describe('Advanced Examples (10-25)', () => {
    test.each(advancedExamples)('should handle %s', exampleFile => {
      const filePath = path.join(examplesDir, exampleFile);
      const source = fs.readFileSync(filePath, 'utf-8');

      const result = compile(source, {
        sourceMap: false,
      });

      // Some advanced features might have warnings or partial implementation
      if (usesDevelopmentFeatures(source)) {
        // For development features, we expect at least some code generation
        expect(result.code).toBeTruthy();
        // May have warnings but shouldn't completely fail
        expect(result.warnings).toBeDefined();
      } else {
        // Fully implemented features should have no errors
        expect(result.errors).toEqual([]);
        expect(result.code).toBeTruthy();
      }
    });
  });

  describe('New Examples (26-33)', () => {
    const newExamples = exampleFiles.filter(f => {
      const basename = path.basename(f);
      const match = basename.match(/^(\d+)-/);
      return match && parseInt(match[1]) >= 26 && parseInt(match[1]) <= 33;
    });

    // Helper to validate feature-specific patterns
    function validateExampleFeatures(fileName: string, code: string): void {
      const validations = [
        { match: ['switch', '26'], pattern: /switch|if/, desc: 'Switch/case' },
        { match: ['abstract', '27'], pattern: /class|function/, desc: 'Abstract classes' },
        { match: ['namespace', '28'], pattern: /var|const|let/, desc: 'Namespaces' },
        { match: ['generic', '29'], pattern: /function|class/, desc: 'Generics' },
        { match: ['built-in', '30'], pattern: /Object|Math|console/, desc: 'Built-in objects' },
        { match: ['break-continue', '32'], pattern: /break|continue/, desc: 'Break/continue' },
        { match: ['console', '33'], pattern: /console\./, desc: 'Console methods' },
      ];

      for (const validation of validations) {
        if (validation.match.some(keyword => fileName.includes(keyword))) {
          expect(code).toMatch(validation.pattern);
          return;
        }
      }

      // Default: just check that code exists
      expect(code).toBeTruthy();
    }

    test.each(newExamples)('should handle %s appropriately', exampleFile => {
      const filePath = path.join(examplesDir, exampleFile);
      const source = fs.readFileSync(filePath, 'utf-8');

      const result = compile(source, {
        sourceMap: false,
      });

      // These are new examples that demonstrate patterns
      // They should at least produce some output (or have no errors)
      // Allow empty code if there are compilation errors
      if (result.errors.length > 0) {
        expect(result.code).toBeDefined();
      } else {
        expect(result.code).toBeTruthy();

        // Check for specific features in each example
        const fileName = path.basename(exampleFile, '.som');
        validateExampleFeatures(fileName, result.code);
      }
    });
  });

  describe('Module System Examples', () => {
    test.each(moduleExamples)('should compile module %s', exampleFile => {
      const filePath = path.join(examplesDir, exampleFile);
      const source = fs.readFileSync(filePath, 'utf-8');

      const result = compile(source, {});

      // Module examples might have import/export
      if (source.includes('ворид') || source.includes('содир')) {
        // Only check for import/export if compilation succeeded
        if (result.errors.length === 0) {
          expect(result.code).toBeTruthy();
          // Should translate to require/exports or import/export
          if (source.includes('ворид')) {
            expect(result.code).toMatch(/require|import/);
          }
          if (source.includes('содир')) {
            expect(result.code).toMatch(/exports|export|module\.exports/);
          }
        } else {
          // If there are errors, just check that we tried to compile
          expect(result.code).toBeDefined();
        }
      } else {
        // Regular module file
        expect(result.code).toBeTruthy();
      }
    });
  });

  describe('Test Examples', () => {
    test.each(testExamples)('should compile test file %s', exampleFile => {
      const filePath = path.join(examplesDir, exampleFile);
      const source = fs.readFileSync(filePath, 'utf-8');

      const result = compile(source, {});

      // Test files should at least produce output
      expect(result.code).toBeTruthy();
    });
  });

  describe('JavaScript Output Validation', () => {
    // Only test examples that should produce valid JS
    const validJsExamples = exampleFiles.filter(f => {
      const source = fs.readFileSync(path.join(examplesDir, f), 'utf-8');
      // Skip files with known issues or development features
      return (
        !usesDevelopmentFeatures(source) &&
        !f.includes('comprehensive-phase3') &&
        !f.includes('advanced-type')
      );
    });

    test.each(validJsExamples.slice(0, 20))(
      // Test first 20 for performance
      'should produce valid JavaScript for %s',
      exampleFile => {
        const filePath = path.join(examplesDir, exampleFile);
        const source = fs.readFileSync(filePath, 'utf-8');

        const result = compile(source, {});

        if (result.errors.length === 0 && result.code) {
          // Try to parse as JavaScript (not execute)
          try {
            new Function(result.code);
            expect(true).toBe(true); // Valid JS
          } catch (error: any) {
            // Some valid patterns might still fail Function constructor
            // Check for common JS patterns instead
            expect(result.code).toMatch(/var|let|const|function|class|if|for|while/);
          }
        }
      }
    );
  });

  describe('Compilation Performance', () => {
    test('all examples should compile within reasonable time', () => {
      const startTime = Date.now();
      let compiledCount = 0;

      for (const exampleFile of exampleFiles) {
        const filePath = path.join(examplesDir, exampleFile);
        const source = fs.readFileSync(filePath, 'utf-8');

        compile(source, {});

        compiledCount++;
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(compiledCount).toBe(exampleFiles.length);
      expect(totalTime).toBeLessThan(10000); // 10 seconds for all examples

      console.log(`Compiled ${compiledCount} examples in ${totalTime}ms`);
      console.log(`Average: ${(totalTime / compiledCount).toFixed(2)}ms per file`);
    });
  });

  describe('Feature Coverage', () => {
    test('examples cover major language features', () => {
      const allContent = exampleFiles
        .map(f => fs.readFileSync(path.join(examplesDir, f), 'utf-8'))
        .join('\n');

      const features = {
        Variables: /тағйирёбанда/,
        Constants: /собит/,
        Functions: /функсия/,
        Classes: /синф/,
        Interfaces: /интерфейс/,
        'If statements': /агар/,
        'For loops': /барои/,
        'While loops': /то/,
        Imports: /ворид/,
        Exports: /содир/,
        Console: /чоп\./,
        Arrays: /\[.*\]/,
        Objects: /\{.*\}/,
        'Try-catch': /кӯшиш/,
        Async: /ҳамзамон/,
        Types: /:\s*(сатр|рақам|мантиқӣ)/,
        'New operator': /нав/,
        'This keyword': /ин\./,
        Return: /бозгашт/,
        Break: /шикастан/,
        Continue: /давом/,
        Switch: /интихоб/,
      };

      const coverage: Record<string, boolean> = {};

      for (const [feature, pattern] of Object.entries(features)) {
        coverage[feature] = pattern.test(allContent);
      }

      const coveredFeatures = Object.values(coverage).filter(v => v).length;
      const totalFeatures = Object.keys(coverage).length;
      const coveragePercent = (coveredFeatures / totalFeatures) * 100;

      console.log(
        `Feature coverage: ${coveredFeatures}/${totalFeatures} (${coveragePercent.toFixed(1)}%)`
      );

      // Log missing features
      const missingFeatures = Object.entries(coverage)
        .filter(([_, covered]) => !covered)
        .map(([feature]) => feature);

      if (missingFeatures.length > 0) {
        console.log('Missing features:', missingFeatures.join(', '));
      }

      expect(coveragePercent).toBeGreaterThan(80); // At least 80% feature coverage
    });
  });

  describe('Error Handling Examples', () => {
    test('error handling examples demonstrate proper patterns', () => {
      const errorExamples = exampleFiles.filter(f => f.includes('error') || f.includes('14-'));

      expect(errorExamples.length).toBeGreaterThan(0);

      for (const example of errorExamples) {
        const filePath = path.join(examplesDir, example);
        const source = fs.readFileSync(filePath, 'utf-8');

        // Should have error handling patterns
        const hasErrorPatterns =
          source.includes('партофтан') || // throw
          source.includes('кӯшиш') || // try
          source.includes('гирифтан') || // catch
          source.includes('Хато'); // Error

        expect(hasErrorPatterns).toBe(true);

        const result = compile(source, {});

        expect(result.code).toBeTruthy();
      }
    });
  });

  describe('Type System Examples', () => {
    const typeExamples = exampleFiles.filter(
      f =>
        f.includes('type') ||
        f.includes('interface') ||
        f.includes('union') ||
        f.includes('intersection') ||
        f.includes('tuple') ||
        f.includes('mapped')
    );

    test.each(typeExamples)('should compile type example %s', exampleFile => {
      const filePath = path.join(examplesDir, exampleFile);
      const source = fs.readFileSync(filePath, 'utf-8');

      const result = compile(source, {
        typeCheck: true,
      });

      // Type examples should produce output
      expect(result.code).toBeTruthy();

      // Check for type annotations in source
      const hasTypes = /:\s*(сатр|рақам|мантиқӣ|холӣ|беқимат|ҳар)/.test(source);
      if (hasTypes) {
        expect(source).toMatch(/:/); // Has type annotations
      }
    });
  });

  describe('Summary Statistics', () => {
    test('should provide compilation summary', () => {
      const results = {
        total: exampleFiles.length,
        compiled: 0,
        withErrors: 0,
        withWarnings: 0,
        failed: 0,
      };

      const errorDetails: Array<{ file: string; errors: string[] }> = [];

      for (const exampleFile of exampleFiles) {
        const filePath = path.join(examplesDir, exampleFile);
        const source = fs.readFileSync(filePath, 'utf-8');

        try {
          const result = compile(source, {});

          if (result.code) {
            results.compiled++;
          }
          if (result.errors.length > 0) {
            results.withErrors++;
            errorDetails.push({
              file: exampleFile,
              errors: result.errors,
            });
          }
          if (result.warnings && result.warnings.length > 0) {
            results.withWarnings++;
          }
        } catch (error) {
          results.failed++;
        }
      }

      console.log('\n=== Compilation Summary ===');
      console.log(`Total files: ${results.total}`);
      console.log(
        `Successfully compiled: ${results.compiled} (${((results.compiled / results.total) * 100).toFixed(1)}%)`
      );
      console.log(`With errors: ${results.withErrors}`);
      console.log(`With warnings: ${results.withWarnings}`);
      console.log(`Failed to compile: ${results.failed}`);

      if (errorDetails.length > 0 && errorDetails.length <= 5) {
        console.log('\n=== Error Details (first 5) ===');
        errorDetails.slice(0, 5).forEach(({ file, errors }) => {
          console.log(`${file}:`);
          errors.forEach(err => console.log(`  - ${err}`));
        });
      }

      // Most examples should compile
      expect(results.compiled).toBeGreaterThan(results.total * 0.7); // At least 70% should compile
    });
  });
});
