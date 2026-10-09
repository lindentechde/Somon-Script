#!/usr/bin/env node
/**
 * Bundles the browser compiler (dist/browser.js and the dist modules it
 * requires) into one script, without a bundler: each CommonJS module becomes a
 * function in a small module table. The bundle works as a classic <script>
 * (global `SomonScript`) and as a CommonJS module.
 *
 * Only relative requires are allowed: a Node.js built-in or a package in the
 * module graph fails the build, so the bundle runs in any browser.
 *
 * Usage: node scripts/build-browser.js [--out <file>]   (after `npm run build`)
 * Default outputs: dist/browser/somonscript.js and docs/playground/somonscript.js.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_OUTPUTS = [
  path.join(ROOT, 'dist', 'browser', 'somonscript.js'),
  path.join(ROOT, 'docs', 'playground', 'somonscript.js'),
];

/**
 * Module specifiers a module requires, found in its syntax tree (a `require(…)`
 * inside a string or comment does not count). A require of a computed name
 * or a dynamic import fails the build: neither can be bundled.
 */
function findRequires(source, id) {
  const ts = require('typescript');
  const file = ts.createSourceFile(id, source, ts.ScriptTarget.Latest, false, ts.ScriptKind.JS);
  const specifiers = [];
  const visit = node => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (callee.kind === ts.SyntaxKind.ImportKeyword) {
        throw new Error(`${id} has a dynamic import(), which the browser bundle cannot include`);
      }
      if (ts.isIdentifier(callee) && callee.text === 'require') {
        const [argument] = node.arguments;
        if (!argument || !ts.isStringLiteralLike(argument)) {
          throw new Error(`${id} requires a computed module name, which cannot be bundled`);
        }
        specifiers.push(argument.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return specifiers;
}

/** Module id (path relative to the dist directory, `/`-separated) a require names. */
function resolveRequire(distDir, fromId, specifier) {
  if (!specifier.startsWith('.')) {
    throw new Error(
      `${fromId} requires '${specifier}': the browser bundle may only contain the compiler's own modules`
    );
  }
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromId), specifier));
  for (const candidate of [`${base}.js`, base, `${base}/index.js`]) {
    const file = path.join(distDir, ...candidate.split('/'));
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return candidate;
  }
  throw new Error(`${fromId} requires '${specifier}', which is not in ${distDir}`);
}

/**
 * Collects the module graph from the entry: { id → { source, requires: { specifier → id } } }.
 */
function collectModules(distDir, entryId) {
  const modules = new Map();
  const pending = [entryId];
  while (pending.length > 0) {
    const id = pending.pop();
    if (modules.has(id)) continue;
    const raw = fs.readFileSync(path.join(distDir, ...id.split('/')), 'utf8');
    const source = raw.replace(/\n?\/\/# sourceMappingURL=\S*\s*$/, '\n');
    const requires = {};
    for (const specifier of findRequires(source, id)) {
      const target = resolveRequire(distDir, id, specifier);
      requires[specifier] = target;
      pending.push(target);
    }
    modules.set(id, { source, requires });
  }
  return modules;
}

/** The bundle's source text. */
function buildBrowserBundle(options = {}) {
  const distDir = options.distDir || path.join(ROOT, 'dist');
  const entry = options.entry || 'browser.js';
  if (!fs.existsSync(path.join(distDir, entry))) {
    throw new Error(`${path.join(distDir, entry)} not found: run 'npm run build' first`);
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const modules = collectModules(distDir, entry);
  const ids = [...modules.keys()].sort();
  const table = ids
    .map(id => {
      const { source, requires } = modules.get(id);
      const body = source.replace(/__SOMON_VERSION__/g, pkg.version);
      // The module text goes in unchanged: re-indenting would alter multi-line strings
      return [
        `  ${JSON.stringify(id)}: [`,
        `    function (module, exports, require) {`,
        body.trimEnd(),
        `    },`,
        `    ${JSON.stringify(requires)},`,
        `  ],`,
      ].join('\n');
    })
    .join('\n');

  const code = `/*!
 * SomonScript ${pkg.version} — compiler for browsers (${ids.length} modules).
 * ${pkg.homepage || ''} — ${pkg.license} License.
 * Built by scripts/build-browser.js; TypeScript is loaded separately when lowering is needed.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SomonScript = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // The type checker looks names up on the global object
  var global = typeof globalThis !== 'undefined' ? globalThis : self;
  var modules = {
${table}
  };
  var cache = {};
  function load(id) {
    if (cache[id]) return cache[id].exports;
    var definition = modules[id];
    var module = (cache[id] = { exports: {} });
    definition[0].call(module.exports, module, module.exports, function (specifier) {
      return load(definition[1][specifier]);
    });
    return module.exports;
  }
  return load(${JSON.stringify(entry)});
});
`;
  return { code, modules: ids, version: pkg.version };
}

function main(argv) {
  const outIndex = argv.indexOf('--out');
  const outputs = outIndex !== -1 ? [path.resolve(argv[outIndex + 1])] : DEFAULT_OUTPUTS;
  const { code, modules } = buildBrowserBundle();
  for (const output of outputs) {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, code);
    console.log(
      `✅ ${path.relative(process.cwd(), output)} (${modules.length} modules, ${Math.round(code.length / 1024)} KB)`
    );
  }
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { buildBrowserBundle, collectModules, findRequires };
