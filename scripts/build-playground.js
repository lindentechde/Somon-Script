#!/usr/bin/env node
/**
 * Builds the playground for learners into one file, playground/dist/index.html:
 * the page (playground/src), the examples (playground/examples), the tasks of
 * the tutorial with their statements and tests (docs/tutorial/tasks) and the
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
const TASKS = path.join(ROOT, 'docs', 'tutorial', 'tasks');
const LESSONS = path.join(ROOT, 'docs', 'tutorial', 'tj');
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

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** `код` and **bold** of a line of Markdown, as HTML. */
function inlineHtml(line) {
  return line
    .split('`')
    .map((part, index) =>
      index % 2 === 1
        ? `<code>${escapeHtml(part)}</code>`
        : escapeHtml(part).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    )
    .join('');
}

/** The Markdown of a task statement as HTML: paragraphs, code blocks, `код` and **bold**. */
function markdownHtml(markdown) {
  const html = [];
  let paragraph = [];
  let fence = null;
  const flush = () => {
    if (paragraph.length > 0) html.push(`<p>${inlineHtml(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  for (const line of markdown.split('\n')) {
    if (/^```/.test(line)) {
      if (fence) {
        html.push(`<pre>${escapeHtml(fence.join('\n'))}</pre>`);
        fence = null;
      } else {
        flush();
        fence = [];
      }
    } else if (fence) {
      fence.push(line);
    } else if (line.trim() === '') {
      flush();
    } else {
      paragraph.push(line.trim());
    }
  }
  flush();
  return html.join('');
}

/** The part of a task page from its heading `## <heading> <id>:` to `### <end>`. */
function section(page, id, heading, end) {
  const start = page.indexOf(`## ${heading} ${id}:`);
  const stop = page.indexOf(`### ${end}`, start);
  if (start === -1 || stop === -1)
    throw new Error(`docs/tutorial/tasks/${id}: no section '${heading}'`);
  return page.slice(page.indexOf('\n', start) + 1, stop).trim();
}

/**
 * The tasks of the tutorial, from their pages (docs/tutorial/tasks/<id>/README.md):
 * the title and statement in Tajik and Russian, and the starting program, input
 * and tests of the page's playground link (which scripts/tutorial-links.js
 * makes from the code above it and the task's tests).
 */
function tasks() {
  // In the order the lessons give them
  const order = fs
    .readdirSync(LESSONS)
    .filter(file => /^\d\d-.*\.md$/.test(file))
    .sort()
    .flatMap(file =>
      [
        ...fs.readFileSync(path.join(LESSONS, file), 'utf8').matchAll(/\.\.\/tasks\/([^/]+)\//g),
      ].map(match => match[1])
    );
  const rank = id => (order.includes(id) ? order.indexOf(id) : order.length);
  return fs
    .readdirSync(TASKS)
    .filter(id => fs.existsSync(path.join(TASKS, id, 'tests')))
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map(id => {
      const page = fs.readFileSync(path.join(TASKS, id, 'README.md'), 'utf8');
      const title = /^# (.+?) \/ (.+)$/m.exec(page);
      const link = /\(https:\/\/lindentechde\.github\.io\/Somon-Script\/#([^)]*)\)/.exec(page);
      if (!title || !link)
        throw new Error(`docs/tutorial/tasks/${id}: no title or playground link`);
      const params = new URLSearchParams(link[1]);
      const decode = name => Buffer.from(params.get(name) ?? '', 'base64url').toString('utf8');
      return {
        id,
        lesson: Number(id.slice(0, 2)),
        title: { tj: title[1], ru: title[2] },
        text: {
          tj: markdownHtml(section(page, id, 'Масъала', 'Мисол')),
          ru: markdownHtml(section(page, id, 'Задача', 'Пример')),
        },
        code: decode('c'),
        input: decode('i'),
        tests: JSON.parse(decode('t')),
      };
    });
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
    `window.SOMON_TASKS = ${scriptJson(tasks())};`,
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

module.exports = { buildPlayground, tasks, MAX_BYTES };
