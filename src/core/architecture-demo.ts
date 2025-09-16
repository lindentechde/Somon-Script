/**
 * Architecture Demo - Complete Implementation Example
 *
 * This file demonstrates the refined architecture with:
 * - Clean separation of concerns
 * - Modular lexer with Strategy Pattern
 * - Application layer with use cases
 * - Error handling and metrics collection
 * - Comprehensive compilation pipeline
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */

import { SomoniCompiler, demonstrateApplicationLayer } from './application-layer';
import { demonstrateModularLexer } from './modular-lexer-compatible';

export async function demonstrateCompleteArchitecture(): Promise<void> {
  console.log('🎯 Somoni Script - Complete Architecture Demonstration');
  console.log('=====================================================\n');

  console.log('This demonstration shows the refined architecture with:');
  console.log('✅ Clean Architecture principles');
  console.log('✅ Domain-driven design patterns');
  console.log('✅ Modular lexer with Strategy Pattern');
  console.log('✅ Application layer with use cases');
  console.log('✅ Comprehensive error handling');
  console.log('✅ Performance metrics collection');
  console.log('✅ Node.js compatibility layers\n');

  // Part 1: Demonstrate modular lexer
  console.log('='.repeat(60));
  demonstrateModularLexer();
  console.log();

  // Part 2: Demonstrate application layer
  console.log('='.repeat(60));
  await demonstrateApplicationLayer();
  console.log();

  // Part 3: Demonstrate advanced compilation scenarios
  console.log('='.repeat(60));
  await demonstrateAdvancedScenarios();
  console.log();

  console.log('🎉 Complete architecture demonstration finished!');
  console.log('📝 This shows how the modular, clean architecture');
  console.log('   enables maintainable and testable code.');
}

async function demonstrateAdvancedScenarios(): Promise<void> {
  console.log('🚀 Advanced Compilation Scenarios');
  console.log('==================================\n');

  const compiler = new SomoniCompiler();

  // Scenario 1: Complex function with type annotations
  const complexCode = `
интерфейс Корбар {
    исм: сатр;
    сол: рақам;
    фаъол: мантиқӣ;
}

функсия коркардиКорбар(корбар: Корбар): сатр {
    агар (корбар.фаъол) {
        бозгашт "Корбар " + корбар.исм + " фаъол аст";
    } вагарна {
        бозгашт "Корбар " + корбар.исм + " ғайрифаъол аст";
    }
}

тағйирёбанда корбари_нав: Корбар = {
    исм: "Аҳмад",
    сол: 25,
    фаъол: дуруст
};

рақам натиҷа = коркардиКорбар(корбари_нав);
`;

  console.log('📝 Scenario 1: Complex Type System Usage');
  console.log('Source Code:');
  console.log(complexCode);
  console.log();

  try {
    const result1 = await compiler.compile(complexCode, {
      target: 'typescript',
      strict: true,
    });

    console.log('📊 Compilation Results:');
    console.log(`- Success: ${result1.success}`);
    console.log(`- Tokens processed: ${result1.metrics.tokenCount}`);
    console.log(`- Processing time: ${result1.metrics.totalTime.toFixed(2)}ms`);
    console.log(`- Output size: ${result1.metrics.outputSize} characters`);

    if (result1.errors.length > 0) {
      console.log('\n❌ Errors found:');
      result1.errors.forEach((error, index) => {
        console.log(`${index + 1}. [${error.category}] ${error.message} (line ${error.line})`);
      });
    }

    if (result1.output) {
      console.log('\n📤 Generated Output:');
      console.log('```typescript');
      console.log(result1.output);
      console.log('```');
    }
  } catch (error) {
    console.error('❌ Compilation failed:', error);
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Scenario 2: Error handling showcase
  const errorCode = `
функсия нодуруст_синтаксис( {
    бозгашт "Ин хато дорад";
}

тағйирёбанда === номаълум;
`;

  console.log('📝 Scenario 2: Error Handling Demonstration');
  console.log('Source Code (with intentional errors):');
  console.log(errorCode);
  console.log();

  try {
    const result2 = await compiler.compile(errorCode);

    console.log('📊 Error Analysis:');
    console.log(`- Success: ${result2.success}`);
    console.log(`- Total errors: ${result2.errors.length}`);
    console.log(`- Total warnings: ${result2.warnings.length}`);

    if (result2.errors.length > 0) {
      console.log('\n🔍 Detailed Error Analysis:');
      const errorsByCategory = groupErrorsByCategory(result2.errors);

      Object.entries(errorsByCategory).forEach(([category, errors]) => {
        console.log(`\n${category.toUpperCase()} ERRORS (${errors.length}):`);
        errors.forEach((error, index) => {
          console.log(
            `  ${index + 1}. ${error.message} at line ${error.line}, column ${error.column}`
          );
        });
      });
    }
  } catch (error) {
    console.error('❌ Error analysis failed:', error);
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Scenario 3: Performance metrics
  const performanceCode = `
// Large code sample for performance testing
функсия фибоначи(н: рақам): рақам {
    агар (н <= 1) {
        бозгашт н;
    }
    бозгашт фибоначи(н - 1) + фибоначи(н - 2);
}

барои (тағйирёбанда и = 0; и < 10; и++) {
    рақам натиҷа = фибоначи(и);
    чоп.сабт("Фибоначи(" + и + ") = " + натиҷа);
}
`;

  console.log('📝 Scenario 3: Performance Metrics Collection');
  console.log('Testing compilation performance...');

  const performanceStart = performance.now();
  const result3 = await compiler.compile(performanceCode, {
    target: 'javascript',
    optimize: true,
  });
  const totalDuration = performance.now() - performanceStart;

  console.log('\n⚡ Performance Analysis:');
  console.log(`- Total compilation time: ${totalDuration.toFixed(2)}ms`);
  console.log(
    `- Lexical analysis: ${result3.metrics.lexicalTime.toFixed(2)}ms (${((result3.metrics.lexicalTime / totalDuration) * 100).toFixed(1)}%)`
  );
  console.log(
    `- Code generation: ${result3.metrics.codeGenTime.toFixed(2)}ms (${((result3.metrics.codeGenTime / totalDuration) * 100).toFixed(1)}%)`
  );
  console.log(
    `- Tokens per second: ${Math.round(result3.metrics.tokenCount / (result3.metrics.lexicalTime / 1000))}`
  );
  console.log(
    `- Characters per second: ${Math.round(performanceCode.length / (totalDuration / 1000))}`
  );
}

type CategorizedErrorLike = { category?: string } & Record<string, unknown>;
function groupErrorsByCategory<T extends { category?: string }>(errors: T[]): Record<string, T[]> {
  return errors.reduce<Record<string, T[]>>((groups, error) => {
    const category = (error.category && String(error.category)) || 'unknown';
    if (!groups[category]) groups[category] = [];
    groups[category].push(error);
    return groups;
  }, {});
}

// ===== EXAMPLE INTEGRATION WITH EXISTING CODEBASE =====

export function integrateWithExistingLexer(): void {
  console.log('🔗 Integration Example with Existing Codebase');
  console.log('=============================================\n');

  console.log('The new modular architecture can be integrated incrementally:');
  console.log();

  console.log('1. 📦 Keep existing lexer.ts as fallback');
  console.log('2. 🆕 Use ModularLexer for new features');
  console.log('3. 🔄 Gradually migrate existing code');
  console.log('4. 🧪 Run both implementations in parallel for testing');
  console.log('5. ✅ Switch to new implementation when validated');
  console.log();

  console.log('Example migration strategy:');
  console.log('```typescript');
  console.log('// Phase 1: Add new lexer alongside existing one');
  console.log('import { Lexer as OldLexer } from "./lexer";');
  console.log('import { ModularLexer } from "./core/modular-lexer-compatible";');
  console.log('');
  console.log('// Phase 2: Feature flag for gradual rollout');
  console.log('const USE_NEW_LEXER = process.env.USE_MODULAR_LEXER === "true";');
  console.log('');
  console.log('function tokenize(source: string) {');
  console.log('  if (USE_NEW_LEXER) {');
  console.log('    const lexer = new ModularLexer();');
  console.log('    return lexer.tokenize(source);');
  console.log('  } else {');
  console.log('    const lexer = new OldLexer();');
  console.log('    return lexer.tokenize(source);');
  console.log('  }');
  console.log('}');
  console.log('');
  console.log('// Phase 3: Comprehensive testing');
  console.log('function validateMigration(source: string) {');
  console.log('  const oldResult = new OldLexer().tokenize(source);');
  console.log('  const newResult = new ModularLexer().tokenize(source);');
  console.log('  ');
  console.log('  // Compare results and log differences');
  console.log('  if (!tokensEqual(oldResult.tokens, newResult.tokens)) {');
  console.log('    console.warn("Token mismatch detected", { source, oldResult, newResult });');
  console.log('  }');
  console.log('}');
  console.log('```');
  console.log();

  console.log('✅ This approach ensures zero-risk migration with full backwards compatibility.');
}

// Run complete demonstration if this file is executed directly
if (require.main === module) {
  demonstrateCompleteArchitecture()
    .then(() => {
      console.log('\n');
      integrateWithExistingLexer();
    })
    .catch(console.error);
}

export { SomoniCompiler, demonstrateApplicationLayer, demonstrateModularLexer };
