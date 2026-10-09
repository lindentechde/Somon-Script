#!/usr/bin/env node

// Runs the LeetCode solutions in examples/leetcode with the SomonScript CLI and
// reports which ones pass their built-in test cases.
//
// Usage:
//   node scripts/run-leetcode.js            # run every solution
//   node scripts/run-leetcode.js 0001 0146  # run the solutions whose file name contains a filter
//   node scripts/run-leetcode.js --strict   # also enable strict type checking
//   node scripts/run-leetcode.js --verbose  # print the output of passing solutions too

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SUCCESS_LINE = 'Ҳамаи санҷишҳо гузаштанд';
const FAILURE_MARK = '✗';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const verbose = args.includes('--verbose');
const filters = args.filter(arg => !arg.startsWith('--'));

const leetcodeDir = path.join(__dirname, '..', 'examples', 'leetcode');
const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');

if (!fs.existsSync(cliPath)) {
  console.log('❌ CLI not built. Run "npm run build" first.');
  process.exit(1);
}

const files = fs
  .readdirSync(leetcodeDir)
  .filter(file => file.endsWith('.som'))
  .filter(file => filters.length === 0 || filters.some(filter => file.includes(filter)))
  .sort();

if (files.length === 0) {
  console.log('❌ No matching .som files found in examples/leetcode');
  process.exit(1);
}

const failures = [];

for (const file of files) {
  const cliArgs = [cliPath, 'run', path.join(leetcodeDir, file)];
  if (strict) {
    cliArgs.push('--strict');
  }
  const result = spawnSync(process.execPath, cliArgs, { encoding: 'utf8', timeout: 60000 });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const lines = output.split('\n');

  let reason = '';
  if (result.error) {
    reason = result.error.message;
  } else if (result.status !== 0) {
    reason = `exit code ${result.status}`;
  } else if (lines.some(line => line.startsWith(FAILURE_MARK))) {
    reason = 'failed test case';
  } else if (!output.includes(SUCCESS_LINE)) {
    reason = `missing "${SUCCESS_LINE}"`;
  }

  if (reason) {
    failures.push(file);
    console.log(`❌ ${file} (${reason})`);
    console.log(
      output
        .trim()
        .split('\n')
        .map(line => `     ${line}`)
        .join('\n')
    );
  } else {
    const passed = lines.filter(line => line.startsWith('✓')).length;
    console.log(`✅ ${file} (${passed} tests)`);
    if (verbose) {
      console.log(output.trim().replace(/^/gm, '     '));
    }
  }
}

console.log(`\n📊 ${files.length - failures.length}/${files.length} solutions passed`);
if (failures.length > 0) {
  console.log(`❌ Failed: ${failures.join(', ')}`);
  process.exit(1);
}
