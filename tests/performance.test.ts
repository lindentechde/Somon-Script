import { performance } from 'perf_hooks';

import { compile } from '../src/compiler';
import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';

const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const threshold = (base: number) => base * (isCI ? 5 : 1.5);

describe('Performance Tests', () => {
  const smallProgram = `
    тағйирёбанда ном: сатр = "Аҳмад";
    чоп.сабт(ном);
  `;

  const mediumProgram = `
    интерфейс Корбар {
      ном: сатр;
      синну_сол: рақам;
      email?: сатр;
    }

    функсия салом_гуфтан(корбар: Корбар): сатр {
      бозгашт "Салом, " + корбар.ном;
    }

    тағйирёбанда корбарҳо: Корбар[] = [
      { ном: "Аҳмад", синну_сол: 25 },
      { ном: "Фотима", синну_сол: 30, email: "fotima@example.com" }
    ];

    барои (тағйирёбанда и = 0; и < корбарҳо.дарозӣ; и++) {
      чоп.сабт(салом_гуфтан(корбарҳо[и]));
    }
  `;

  const largeProgram = Array(50).fill(mediumProgram).join('\n\n');

  describe('Lexer Performance', () => {
    test('should tokenize small program quickly', () => {
      const start = performance.now();
      const lexer = new Lexer(smallProgram);
      lexer.tokenize();
      const end = performance.now();

      expect(end - start).toBeLessThan(threshold(20));
    });

    test('should tokenize medium program efficiently', () => {
      const start = performance.now();
      const lexer = new Lexer(mediumProgram);
      lexer.tokenize();
      const end = performance.now();

      expect(end - start).toBeLessThan(threshold(50));
    });

    test('should handle large programs within reasonable time', () => {
      const start = performance.now();
      const lexer = new Lexer(largeProgram);
      lexer.tokenize();
      const end = performance.now();

      expect(end - start).toBeLessThan(threshold(500));
    });
  });

  describe('Parser Performance', () => {
    test('should parse small program quickly', () => {
      const lexer = new Lexer(smallProgram);
      const tokens = lexer.tokenize();

      const start = performance.now();
      const parser = new Parser(tokens);
      parser.parse();
      const end = performance.now();

      expect(end - start).toBeLessThan(threshold(20));
    });

    test('should parse medium program efficiently', () => {
      const lexer = new Lexer(mediumProgram);
      const tokens = lexer.tokenize();

      const start = performance.now();
      const parser = new Parser(tokens);
      parser.parse();
      const end = performance.now();

      expect(end - start).toBeLessThan(threshold(100));
    });
  });

  describe('Compilation Performance', () => {
    test('should compile small program quickly', () => {
      const start = performance.now();
      compile(smallProgram);
      const end = performance.now();

      expect(end - start).toBeLessThan(threshold(50));
    });

    test('should compile medium program efficiently', () => {
      const start = performance.now();
      compile(mediumProgram);
      const end = performance.now();

      expect(end - start).toBeLessThan(threshold(200));
    });

    test('should maintain performance with type checking', () => {
      const start = performance.now();
      compile(mediumProgram, { typeCheck: true, strict: true });
      const end = performance.now();

      expect(end - start).toBeLessThan(threshold(300));
    });
  });

  describe('Memory Usage', () => {
    test('should not leak memory during compilation', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Compile multiple programs
      for (let i = 0; i < 100; i++) {
        compile(smallProgram);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Performance Regression Detection', () => {
    const benchmarkResults: { [key: string]: number } = {};

    test('should establish baseline performance', () => {
      const iterations = 10;
      let totalTime = 0;

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        compile(mediumProgram, { typeCheck: true });
        const end = performance.now();
        totalTime += end - start;
      }

      const averageTime = totalTime / iterations;
      benchmarkResults.baseline = averageTime;

      expect(averageTime).toBeLessThan(500); // Baseline should be under 500ms
    });

    test('should detect performance regressions', () => {
      if (!benchmarkResults.baseline) {
        return; // Skip if baseline not established
      }

      const iterations = 5;
      let totalTime = 0;

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        compile(mediumProgram, { typeCheck: true });
        const end = performance.now();
        totalTime += end - start;
      }

      const averageTime = totalTime / iterations;
      // Use more lenient threshold in CI environments and for development
      const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
      const multiplier = isCI ? 5.0 : 4.0; // Allow more variance for stability
      const regressionThreshold = benchmarkResults.baseline * multiplier;

      // Also ensure we don't fail on reasonable absolute times (under 10ms is fine)
      const isReasonableAbsoluteTime = averageTime < 10;

      expect(isReasonableAbsoluteTime || averageTime < regressionThreshold).toBe(true);
    });
  });
});
