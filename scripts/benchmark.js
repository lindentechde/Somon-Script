#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { compile } = require('../dist/compiler');

console.log('🚀 SomonScript Performance Benchmarks\n');

// Test files of different complexities
const testFiles = {
  small: `тағйирёбанда ном: сатр = "Аҳмад";
чоп.сабт(ном);`,

  medium: `интерфейс Корбар {
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
}`,

  complex: `// Complex type system test
навъ КорбарИД = сатр;
навъ Синну_сол = рақам;

интерфейс Суроға {
  кӯча: сатр;
  шаҳр: сатр;
  кишвар: сатр;
}

интерфейс КорбариПурра {
  ном: сатр;
  синну_сол: Синну_сол;
  ид: КорбарИД;
  суроға: Суроға;
  телефон?: сатр;
  фаъол: мантиқӣ;
}

функсия эҷоди_корбар(
  ном: сатр,
  синну_сол: рақам,
  суроға: Суроға
): КорбариПурра {
  бозгашт {
    ном: ном,
    синну_сол: синну_сол,
    ид: "user_" + ном.toLowerCase(),
    суроға: суроға,
    фаъол: дуруст
  };
}

тағйирёбанда корбарҳо: КорбариПурра[] = [];

барои (тағйирёбанда и = 0; и < 100; и++) {
  тағйирёбанда корбар = эҷоди_корбар(
    "Корбар" + и,
    20 + и,
    {
      кӯча: "Кӯчаи " + и,
      шаҳр: "Душанбе",
      кишвар: "Тоҷикистон"
    }
  );
  корбарҳо.илова(корбар);
}

функсия ҳисоби_миёнаи_синну_сол(корбарҳо: КорбариПурра[]): рақам {
  тағйирёбанда ҷамъ = 0;
  барои (тағйирёбанда корбар of корбарҳо) {
    ҷамъ += корбар.синну_сол;
  }
  бозгашт ҷамъ / корбарҳо.дарозӣ;
}`,
};

function benchmark(name, source, iterations = 10) {
  console.log(`📊 Benchmarking ${name}:`);
  console.log(`   Source size: ${source.length} characters`);

  const times = [];
  let totalErrors = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();

    try {
      const result = compile(source, { strict: true });
      const end = performance.now();

      times.push(end - start);
      totalErrors += result.errors.length;

      if (result.errors.length > 0) {
        console.log(`   ⚠️  Iteration ${i + 1}: ${result.errors.length} errors`);
      }
    } catch (error) {
      console.log(`   ❌ Iteration ${i + 1}: ${error.message}`);
      totalErrors++;
    }
  }

  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(`   ⏱️  Average: ${avgTime.toFixed(2)}ms`);
    console.log(`   ⚡ Fastest: ${minTime.toFixed(2)}ms`);
    console.log(`   🐌 Slowest: ${maxTime.toFixed(2)}ms`);
    console.log(`   📈 Throughput: ${((source.length / avgTime) * 1000).toFixed(0)} chars/sec`);
  }

  console.log(
    `   ✅ Success rate: ${(((iterations - totalErrors) / iterations) * 100).toFixed(1)}%`
  );
  console.log('');
}

// Run benchmarks
benchmark('Small File', testFiles.small);
benchmark('Medium File', testFiles.medium);
benchmark('Complex File', testFiles.complex);

// Memory usage
const memUsage = process.memoryUsage();
console.log('💾 Memory Usage:');
console.log(`   RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
console.log(`   Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`   Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
console.log(`   External: ${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);

console.log('\n🎉 Benchmark completed!');
