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

// Helper function to extract and compile dependencies
function compileDependencies(sourceFile) {
  const content = fs.readFileSync(sourceFile, 'utf-8');
  const importRegex = /ворид\s+.*?\s+аз\s+["'](.+?)["']/g;
  const dependencies = [];
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    // Only handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      dependencies.push(importPath);
    }
  }

  // Compile each dependency
  dependencies.forEach(dep => {
    const depPath = path.join(examplesDir, dep.replace('./', ''));
    const depSomPath = depPath.endsWith('.som') ? depPath : `${depPath}.som`;
    const depJsPath = depPath.replace(/\.som$/, '') + '.js';

    if (fs.existsSync(depSomPath) && !fs.existsSync(depJsPath)) {
      try {
        const compileCommand = `node dist/cli.js compile "${depSomPath}" -o "${depJsPath}"`;
        execSync(compileCommand, { stdio: 'pipe' });
      } catch (e) {
        // Ignore compilation errors for dependencies
      }
    }
  });

  return dependencies.map(dep => {
    const depPath = path.join(examplesDir, dep.replace('./', ''));
    return depPath.replace(/\.som$/, '') + '.js';
  });
}

examples.forEach((example, index) => {
  const examplePath = path.join(examplesDir, example);
  const exampleName = example.replace('.som', '');

  console.log(`[${index + 1}/${examples.length}] Testing ${example}...`);

  try {
    // First, compile any dependencies
    const compiledDeps = compileDependencies(examplePath);

    // Use the same approach as 'somon run' - compile to source directory
    const uniqueSuffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const jsPath = path.join(examplesDir, `${exampleName}.somon-test-${uniqueSuffix}.js`);

    try {
      // Try to compile the example to the source directory
      const compileCommand = `node dist/cli.js compile "${examplePath}" -o "${jsPath}"`;
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
        // Try to run the compiled JavaScript with cwd set to examples directory
        try {
          execSync(`node "${path.basename(jsPath)}"`, {
            stdio: 'pipe',
            timeout: 5000,
            cwd: examplesDir,
          });
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
    } finally {
      // Clean up compiled file
      try {
        if (fs.existsSync(jsPath)) {
          fs.unlinkSync(jsPath);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      // Clean up compiled dependencies
      compiledDeps.forEach(depJs => {
        try {
          if (fs.existsSync(depJs)) {
            fs.unlinkSync(depJs);
          }
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      });
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
