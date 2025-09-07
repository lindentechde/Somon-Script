#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Auditing SomonScript Examples\n');

const examplesDir = path.join(__dirname, '..', 'examples');
const examples = fs
  .readdirSync(examplesDir)
  .filter(file => file.endsWith('.som'))
  .sort();

const results = {
  working: [],
  partial: [],
  failing: [],
  total: examples.length,
};

examples.forEach((example, index) => {
  const examplePath = path.join(examplesDir, example);
  const exampleName = example.replace('.som', '');

  console.log(`[${index + 1}/${examples.length}] Testing ${example}...`);

  try {
    // Try to compile the example
    const compileCommand = `node dist/cli.js compile "${examplePath}" -o /tmp/test-${exampleName}.js`;
    execSync(compileCommand, { stdio: 'pipe' });

    // Check if it's a future implementation example
    const content = fs.readFileSync(examplePath, 'utf-8');
    if (content.includes('Future Implementation') || content.includes('planned for future')) {
      results.partial.push({
        name: example,
        status: 'partial',
        reason: 'Marked as future implementation',
      });
      console.log(`  ⚠️  Partial - Future implementation`);
    } else {
      // Try to run the compiled JavaScript
      try {
        const jsPath = `/tmp/test-${exampleName}.js`;
        execSync(`node "${jsPath}"`, { stdio: 'pipe', timeout: 5000 });
        results.working.push({
          name: example,
          status: 'working',
          reason: 'Compiles and runs successfully',
        });
        console.log(`  ✅ Working`);
      } catch (runError) {
        results.partial.push({
          name: example,
          status: 'partial',
          reason: 'Compiles but runtime error: ' + runError.message.split('\n')[0],
        });
        console.log(`  ⚠️  Partial - Runtime error`);
      }
    }
  } catch (compileError) {
    results.failing.push({
      name: example,
      status: 'failing',
      reason: 'Compilation error: ' + compileError.message.split('\n')[0],
    });
    console.log(`  ❌ Failing - Compilation error`);
  }
});

console.log('\n📊 Example Audit Results:');
console.log(`Total Examples: ${results.total}`);
console.log(
  `✅ Working: ${results.working.length} (${Math.round((results.working.length / results.total) * 100)}%)`
);
console.log(
  `⚠️  Partial: ${results.partial.length} (${Math.round((results.partial.length / results.total) * 100)}%)`
);
console.log(
  `❌ Failing: ${results.failing.length} (${Math.round((results.failing.length / results.total) * 100)}%)`
);

if (results.working.length > 0) {
  console.log('\n✅ Working Examples:');
  results.working.forEach(item => console.log(`  - ${item.name}`));
}

if (results.partial.length > 0) {
  console.log('\n⚠️  Partial Examples:');
  results.partial.forEach(item => console.log(`  - ${item.name}: ${item.reason}`));
}

if (results.failing.length > 0) {
  console.log('\n❌ Failing Examples:');
  results.failing.forEach(item => console.log(`  - ${item.name}: ${item.reason}`));
}

// Generate status report
const statusReport = {
  timestamp: new Date().toISOString(),
  total: results.total,
  working: results.working.length,
  partial: results.partial.length,
  failing: results.failing.length,
  workingPercentage: Math.round((results.working.length / results.total) * 100),
  details: {
    working: results.working,
    partial: results.partial,
    failing: results.failing,
  },
};

fs.writeFileSync(
  path.join(__dirname, '..', 'example-audit-report.json'),
  JSON.stringify(statusReport, null, 2)
);

console.log('\n📄 Detailed report saved to example-audit-report.json');

// Exit with appropriate code
process.exit(results.failing.length > 0 ? 1 : 0);
