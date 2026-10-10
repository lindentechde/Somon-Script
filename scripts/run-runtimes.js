#!/usr/bin/env node

// Runs the examples and the LeetCode solutions, compiled by SomonScript, on
// another JavaScript runtime (Bun, Deno) and on Node.js, and compares what
// they print. Each program runs with a seeded Math.random and a fixed clock,
// so the runs are comparable.
//
// Usage:
//   node scripts/run-runtimes.js --runtime bun              # bun, CommonJS and ES modules
//   node scripts/run-runtimes.js --runtime deno             # deno, ES modules
//   node scripts/run-runtimes.js --runtime bun --format esm
//   node scripts/run-runtimes.js --runtime deno 0001 modules   # only programs whose path contains a filter
//
// The runtime's command is `bun` / `deno` from PATH, or BUN / DENO.
// Exits 1 when a program fails on the runtime, a LeetCode solution fails a
// test case, or a program prints something else than on Node.js.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SUCCESS_LINE = 'Ҳамаи санҷишҳо гузаштанд';
const FAILURE_MARK = '✗';

const args = process.argv.slice(2);
const option = name => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
};
const runtime = option('runtime') ?? 'node';
const formats = option('format')
  ? [option('format')]
  : runtime === 'deno'
    ? ['esm'] // Deno runs CommonJS only from .cjs files or packages
    : ['commonjs', 'esm'];
const filters = args.filter(
  (arg, index) => !arg.startsWith('--') && !['--runtime', '--format'].includes(args[index - 1])
);

const RUNTIMES = {
  node: entry => [process.execPath, [entry]],
  bun: entry => [process.env.BUN || 'bun', [entry]],
  deno: entry => [process.env.DENO || 'deno', ['run', '--allow-all', '--quiet', entry]],
};
if (!RUNTIMES[runtime]) {
  console.log(
    `❌ Unknown runtime '${runtime}'. Expected one of: ${Object.keys(RUNTIMES).join(', ')}`
  );
  process.exit(1);
}

const compilerPath = path.join(ROOT, 'dist', 'compiler.js');
if (!fs.existsSync(compilerPath)) {
  console.log('❌ Compiler not built. Run "npm run build" first.');
  process.exit(1);
}
const { compile } = require(compilerPath);

/**
 * Seeded Math.random, a fixed clock and timers that print 0 ms, as in
 * tests/ts-emitter-corpus; and a console that formats values the same way
 * on every runtime (each runtime's own console formats objects its own way),
 * so that the outputs compare what the programs compute.
 */
const PRELUDE = `
let seed = 42;
Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const RealDate = Date;
const NOW = RealDate.UTC(2024, 0, 1, 12, 0, 0);
globalThis.Date = class extends RealDate {
  constructor(...args) { super(...(args.length > 0 ? args : [NOW])); }
  static now() { return NOW; }
};
performance.now = () => 0;

const out = console.log.bind(console);
const err = console.error.bind(console);
let indent = '';
const counts = new Map();

function show(value, seen = new Set(), depth = 0) {
  if (typeof value === 'string') return depth === 0 ? value : JSON.stringify(value);
  if (typeof value === 'bigint') return value + 'n';
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'function') return '[Function ' + (value.name || '(anonymous)') + ']';
  if (value === null || typeof value !== 'object') return String(value);
  if (seen.has(value)) return '[Circular]';
  if (depth > 4) return '[Object]';
  seen.add(value);
  const inner = item => show(item, seen, depth + 1);
  let text;
  if (Array.isArray(value)) text = '[' + value.map(inner).join(', ') + ']';
  else if (value instanceof Map) text = 'Map {' + [...value].map(([k, v]) => inner(k) + ' => ' + inner(v)).join(', ') + '}';
  else if (value instanceof Set) text = 'Set {' + [...value].map(inner).join(', ') + '}';
  else if (value instanceof Error) text = value.name + ': ' + value.message;
  else if (value instanceof RealDate) text = value.toISOString();
  else if (value instanceof RegExp) text = String(value);
  else if (value instanceof Promise) text = 'Promise';
  else {
    const name = value.constructor && value.constructor !== Object ? value.constructor.name + ' ' : '';
    text = name + '{' + Object.keys(value).map(key => key + ': ' + inner(value[key])).join(', ') + '}';
  }
  seen.delete(value);
  return text;
}

function format(args) {
  if (typeof args[0] === 'string' && /%[sdifjoOc%]/.test(args[0])) {
    let rest = args.slice(1);
    const head = args[0].replace(/%([sdifjoOc%])/g, (match, code) => {
      if (code === '%') return '%';
      if (rest.length === 0) return match;
      const value = rest.shift();
      if (code === 'c') return '';
      if (code === 'd' || code === 'i') return String(code === 'i' ? parseInt(value) : Number(value));
      if (code === 'f') return String(parseFloat(value));
      return typeof value === 'string' ? value : show(value, new Set(), 1);
    });
    args = [head, ...rest];
  }
  return args.map(value => show(value)).join(' ');
}

const print = write => (...args) => write(indent + format(args).split('\\n').join('\\n' + indent));
for (const name of ['log', 'info', 'debug', 'dir', 'dirxml', 'table']) console[name] = print(out);
for (const name of ['error', 'warn']) console[name] = print(err);
console.trace = (...args) => err('Trace: ' + format(args));
console.group = console.groupCollapsed = (...args) => {
  if (args.length > 0) console.log(...args);
  indent += '  ';
};
console.groupEnd = () => { indent = indent.slice(2); };
console.assert = (condition, ...args) => { if (!condition) err('Assertion failed: ' + format(args)); };
console.count = (label = 'default') => {
  counts.set(label, (counts.get(label) || 0) + 1);
  console.log(label + ': ' + counts.get(label));
};
console.countReset = (label = 'default') => counts.delete(label);
console.clear = () => {};
for (const name of ['time', 'timeEnd', 'timeLog']) {
  console[name] = (label = 'default', ...rest) => console.log(label + ': 0ms', ...rest);
}
`;

/** Groups of programs that are compiled into one directory, so that they can import each other. */
function groups() {
  const somFiles = dir =>
    fs
      .readdirSync(path.join(ROOT, dir))
      .filter(file => file.endsWith('.som'))
      .sort();
  return [
    { dir: 'examples', files: somFiles('examples'), entries: somFiles('examples') },
    {
      dir: 'examples/leetcode',
      files: somFiles('examples/leetcode'),
      entries: somFiles('examples/leetcode'),
    },
    ...['examples/37-module-imports-demo', 'examples/modules'].map(dir => ({
      dir,
      files: somFiles(dir),
      entries: ['main.som'],
    })),
  ];
}

function compileGroup(group, format, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const type = format === 'esm' ? 'module' : 'commonjs';
  fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type }));
  const extension = format === 'esm' ? 'mjs' : 'cjs';
  fs.writeFileSync(path.join(outDir, `__prelude.${extension}`), PRELUDE);
  const errors = [];
  for (const file of group.files) {
    const source = fs.readFileSync(path.join(ROOT, group.dir, file), 'utf8');
    const result = compile(source, { typeCheck: false, module: format });
    if (result.errors.length > 0) {
      errors.push(`${group.dir}/${file}: ${result.errors[0].split('\n')[0]}`);
      continue;
    }
    fs.writeFileSync(path.join(outDir, file.replace(/\.som$/, '.js')), result.code);
  }
  return errors;
}

/** A file that loads the prelude, then the program. */
function entryFile(outDir, file, format) {
  const name = file.replace(/\.som$/, '');
  const entry = path.join(outDir, `__run_${name}.${format === 'esm' ? 'mjs' : 'cjs'}`);
  fs.writeFileSync(
    entry,
    format === 'esm'
      ? `import './__prelude.mjs';\nawait import('./${name}.js');\n`
      : `require('./__prelude.cjs');\nrequire('./${name}.js');\n`
  );
  return entry;
}

function run(kind, entry, cwd) {
  const [command, commandArgs] = RUNTIMES[kind](entry);
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', NODE_OPTIONS: '' },
  });
  return {
    error: result.error ? result.error.message : undefined,
    status: result.status,
    stdout: normalize(result.stdout ?? ''),
    stderr: normalize(result.stderr ?? ''),
  };
}

/** Output without colours, trailing spaces and CR. */
function normalize(text) {
  return text
    .replace(/\u001b\[[0-9;]*[A-Za-z]/g, '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trimEnd();
}

/** The first line where two outputs differ, for the report. */
function firstDifference(expected, actual) {
  const a = expected.split('\n');
  const b = actual.split('\n');
  let line = 0;
  while (line < a.length && a[line] === b[line]) line++;
  return `line ${line + 1}:\n       node:     ${a[line] ?? '(end)'}\n       ${runtime}: ${b[line] ?? '(end)'}`;
}

const workspace = fs.mkdtempSync(path.join(os.tmpdir(), `somon-${runtime}-`));
const failures = [];
let count = 0;
try {
  const version = spawnSync(
    ...(runtime === 'node'
      ? [process.execPath, ['--version']]
      : [RUNTIMES[runtime]('')[0], ['--version']]),
    {
      encoding: 'utf8',
    }
  );
  if (version.error) {
    console.log(`❌ ${runtime} is not installed: ${version.error.message}`);
    process.exit(1);
  }
  console.log(`🧪 ${version.stdout.trim().split('\n')[0]} against Node.js ${process.version}\n`);

  for (const format of formats) {
    groups().forEach((group, index) => {
      const outDir = path.join(workspace, format, String(index));
      for (const error of compileGroup(group, format, outDir)) failures.push(`compile ${error}`);
      for (const file of group.entries) {
        const name = `${group.dir}/${file}`;
        if (filters.length > 0 && !filters.some(filter => name.includes(filter))) continue;
        if (!fs.existsSync(path.join(outDir, file.replace(/\.som$/, '.js')))) continue;
        count++;
        const entry = entryFile(outDir, file, format);
        const expected = run('node', entry, outDir);
        const actual = run(runtime, entry, outDir);
        const problems = [];
        if (actual.error) problems.push(actual.error);
        if (actual.status !== expected.status) {
          problems.push(
            `exit code ${actual.status} (node: ${expected.status})\n       ${actual.stderr.split('\n').slice(0, 3).join('\n       ')}`
          );
        }
        if (group.dir === 'examples/leetcode') {
          if (actual.stdout.split('\n').some(line => line.startsWith(FAILURE_MARK))) {
            problems.push('a test case failed');
          } else if (!actual.stdout.includes(SUCCESS_LINE)) {
            problems.push(`missing "${SUCCESS_LINE}"`);
          }
        }
        if (actual.stdout !== expected.stdout) {
          problems.push(`output differs at ${firstDifference(expected.stdout, actual.stdout)}`);
        }
        if (problems.length > 0) {
          failures.push(`${name} (${format})`);
          console.log(`❌ ${name} (${format}): ${problems.join('; ')}`);
        } else {
          console.log(`✅ ${name} (${format})`);
        }
      }
    });
  }
} finally {
  fs.rmSync(workspace, { recursive: true, force: true });
}

console.log(
  `\n📊 ${count - failures.length}/${count} programs run alike on ${runtime} and Node.js`
);
if (failures.length > 0) {
  console.log(`❌ Failed: ${failures.join(', ')}`);
  process.exit(1);
}
