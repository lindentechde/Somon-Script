#!/usr/bin/env node
/**
 * Builds the playground for learners into one file, playground/dist/index.html:
 * the page (playground/src), the examples (playground/examples) and the
 * compiler with its run time, bundled for a Web Worker (src/playground/worker.ts,
 * by scripts/build-browser.js). Nothing is loaded from the network: the page
 * works from a web server, from GitHub Pages and opened from a disk or a USB
 * stick (file://). The same sources give the same file.
 *
 * Usage: node scripts/build-playground.js [--out <file>]   (after `npm run build`)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const { buildBrowserBundle } = require('./build-browser.js');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'playground', 'src');
const EXAMPLES = path.join(ROOT, 'playground', 'examples');
const DEFAULT_OUTPUT = path.join(ROOT, 'playground', 'dist', 'index.html');
/** The page must load quickly over a slow connection. */
const MAX_BYTES = 1.5 * 1024 * 1024;

/** Kinds of words for highlighting (src/lsp/keywords.ts) → class names of playground/src/style.css. */
const WORD_CLASSES = {
  declaration: 'kw',
  control: 'kw',
  operator: 'kw',
  modifier: 'kw',
  literal: 'lit',
  type: 'type',
  utilityType: 'type',
  builtin: 'builtin',
};

/** Built-in functions the keyword tables do not list. */
const BUILTIN_FUNCTIONS = ['хондан', 'хонданиРақам'];

function words(distDir) {
  const { KEYWORD_INFO } = require(path.join(distDir, 'lsp', 'keywords.js'));
  const result = {};
  for (const [word, info] of KEYWORD_INFO) {
    if (WORD_CLASSES[info.category]) result[word] = WORD_CLASSES[info.category];
  }
  for (const name of BUILTIN_FUNCTIONS) result[name] = 'builtin';
  return result;
}

function examples() {
  const manifest = JSON.parse(fs.readFileSync(path.join(EXAMPLES, 'examples.json'), 'utf8'));
  return manifest.map(example => ({
    id: example.id,
    name: example.name,
    code: fs.readFileSync(path.join(EXAMPLES, example.file), 'utf8'),
    input: example.input || '',
  }));
}

/** JSON that is safe inside a <script> element. */
function scriptJson(value) {
  // `<` could end the script; U+2028 and U+2029 end lines in old JavaScript engines
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(new RegExp('\u2028', 'g'), '\\u2028')
    .replace(new RegExp('\u2029', 'g'), '\\u2029');
}

function readSource(name) {
  const text = fs.readFileSync(path.join(SOURCE, name), 'utf8');
  if (/<\/script|<!--/i.test(text)) {
    throw new Error(
      `playground/src/${name} contains '</script' or '<!--', which would end the page's script`
    );
  }
  return text;
}

/** The page's HTML. */
function buildPlayground(options = {}) {
  const distDir = options.distDir || path.join(ROOT, 'dist');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const worker = buildBrowserBundle({ distDir, entry: 'playground/worker.js' });
  const script = [
    readSource('strings.js'),
    `window.SOMON_VERSION = ${scriptJson(pkg.version)};`,
    `window.SOMON_WORDS = ${scriptJson(words(distDir))};`,
    `window.SOMON_EXAMPLES = ${scriptJson(examples())};`,
    `window.SOMON_WORKER = ${scriptJson(worker.code)};`,
    readSource('highlight.js'),
    readSource('app.js'),
  ].join('\n');
  const template = fs.readFileSync(path.join(SOURCE, 'index.html'), 'utf8');
  // Functions as replacements: `$` in the code stays as it is
  const html = template
    .replace(/^[ \t]*\/\*STYLE\*\/\n/m, () => readSource('style.css'))
    .replace(/^[ \t]*\/\*SCRIPT\*\/\n/m, () => `${script}\n`);
  const bytes = Buffer.byteLength(html);
  if (bytes > MAX_BYTES) {
    throw new Error(
      `The playground is ${Math.round(bytes / 1024)} KB, more than ${MAX_BYTES / 1024} KB`
    );
  }
  return { html, bytes, modules: worker.modules };
}

function main(argv) {
  const outIndex = argv.indexOf('--out');
  const output = outIndex !== -1 ? path.resolve(argv[outIndex + 1]) : DEFAULT_OUTPUT;
  const { html, bytes, modules } = buildPlayground();
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, html);
  console.log(
    `✅ ${path.relative(process.cwd(), output)} (${modules.length} modules, ${Math.round(bytes / 1024)} KB)`
  );
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { buildPlayground, MAX_BYTES };
