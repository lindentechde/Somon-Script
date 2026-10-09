/*
 * Bundle formats: the code around a bundle's module map and runtime that hands
 * the entry module's exports to the host — `module.exports` (commonjs), `export`
 * (esm) or a global for browsers (iife).
 */
import type { RawSourceMap } from 'source-map';

import type { BundleFormat } from '../targets';

export interface BundleWrapper {
  /** Code before the bundle body (the body runs inside a function). */
  prefix: string;
  /** Code after the body: closes the function and exposes `entryModule`. */
  suffix: string;
}

export interface BundleWrapperOptions {
  format: BundleFormat;
  /** iife: the global (or dotted path of globals) that receives the exports. */
  globalName?: string;
  /** esm: modules the bundle does not contain, imported at load time. */
  imports: readonly string[];
  /** esm: the names the entry module exports. */
  exportNames: readonly string[];
  /** esm: the entry is CommonJS JavaScript, whose `module.exports` is its default export. */
  defaultIsExportsObject?: boolean;
}

const IDENTIFIER_PART = '[\\p{ID_Continue}$\\u200c\\u200d]';

/** `module.exports.ном = …` / `exports.ном = …`: a named export of a compiled module. */
const EXPORT_ASSIGNMENT = new RegExp(
  `(?<![\\w$.])(?:module\\.)?exports\\.([\\p{ID_Start}$_]${IDENTIFIER_PART}*)\\s*=(?!=)`,
  'gu'
);

/** `const t = require("key"); Object.keys(t).forEach(…)`: `содир * аз "…"`. */
const STAR_REEXPORT =
  /(?:const|let|var)\s+([\w$]+)\s*=\s*require\(\s*"((?:[^"\\\n\r]|\\.)*)"\s*\);?\s*Object\.keys\(\1\)\.forEach/g;

/**
 * The names a bundled module exports, following `содир * аз "…"` into the
 * modules of the bundle (`codeByKey`); `default` only for the module itself.
 */
export function collectExportNames(
  entryKey: string,
  codeByKey: ReadonlyMap<string, string>
): string[] {
  const names = new Set<string>();
  const seen = new Set<string>();
  const visit = (key: string, includeDefault: boolean): void => {
    const code = codeByKey.get(key);
    if (code === undefined || seen.has(key)) return;
    seen.add(key);
    for (const match of code.matchAll(EXPORT_ASSIGNMENT)) {
      if (includeDefault || match[1] !== 'default') names.add(match[1]);
    }
    for (const match of code.matchAll(STAR_REEXPORT)) {
      visit(JSON.parse(`"${match[2]}"`) as string, false);
    }
  };
  visit(entryKey, true);
  return [...names];
}

const IMPORT_BINDING = '__somonImport';
const EXPORT_BINDING = '__somonExport';
const BUNDLE_BINDING = '__somonBundle';

/** `var __externalRequire = …;`: how the runtime loads a module that is not in the bundle. */
export function externalRequireCode(format: BundleFormat, imports: readonly string[]): string {
  if (format === 'iife') {
    // A browser script has no module loader
    return '  var __externalRequire = null;\n';
  }
  if (format === 'esm') {
    const entries = imports.map(
      (specifier, index) => `    ${JSON.stringify(specifier)}: ${IMPORT_BINDING}${index}`
    );
    const table = entries.length > 0 ? `{\n${entries.join(',\n')}\n  }` : '{}';
    return (
      `  var __imports = ${table};\n` +
      '  var __externalRequire = function (id) {\n' +
      '    if (__hasOwn.call(__imports, id)) return __imports[id];\n' +
      '    throw new Error("Module \'" + id + "\' is neither in the bundle nor imported by it.");\n' +
      '  };\n'
    );
  }
  return (
    "  var __externalRequire = typeof module !== 'undefined' && module.require\n" +
    '    ? module.require.bind(module)\n' +
    "    : typeof require === 'function'\n" +
    '      ? require\n' +
    '      : null;\n'
  );
}

/** `globalThis[…] = entryModule`, creating the objects of a dotted path on the way. */
function globalAssignment(globalName: string): string {
  const parts = globalName.split('.');
  let target = '__root';
  const lines = [
    "  var __root = typeof globalThis !== 'undefined' ? globalThis\n" +
      "    : typeof self !== 'undefined' ? self\n" +
      "    : typeof window !== 'undefined' ? window\n" +
      '    : global;\n',
  ];
  parts.forEach((part, index) => {
    target += `[${JSON.stringify(part)}]`;
    const value = index === parts.length - 1 ? 'entryModule' : `${target} || {}`;
    lines.push(`  ${target} = ${value};\n`);
  });
  return lines.join('');
}

function esmExports(options: BundleWrapperOptions): string {
  const names = [...options.exportNames];
  const bindings = names.map(
    (name, index) => `var ${EXPORT_BINDING}${index} = ${BUNDLE_BINDING}[${JSON.stringify(name)}];\n`
  );
  const specifiers = names.map((name, index) => `${EXPORT_BINDING}${index} as ${name}`);
  if (options.defaultIsExportsObject && !names.includes('default')) {
    specifiers.push(`${BUNDLE_BINDING} as default`);
  }
  return `${bindings.join('')}export { ${specifiers.join(', ')} };\n`;
}

/** The code around the bundle body for `options.format`. */
export function bundleWrapper(options: BundleWrapperOptions): BundleWrapper {
  switch (options.format) {
    case 'esm':
      return {
        prefix:
          options.imports
            .map(
              (specifier, index) =>
                `import * as ${IMPORT_BINDING}${index} from ${JSON.stringify(specifier)};\n`
            )
            .join('') + `var ${BUNDLE_BINDING} = (function() {\n`,
        suffix: `  return entryModule;\n})();\n${esmExports(options)}`,
      };
    case 'iife':
      return {
        prefix: '(function() {\n',
        suffix: `${options.globalName ? globalAssignment(options.globalName) : ''}})();\n`,
      };
    default:
      return {
        prefix: '(function() {\n',
        suffix:
          '  // Expose entry point exports as bundle exports (for Node.js)\n' +
          "  if (typeof module !== 'undefined' && module.exports) {\n" +
          '    module.exports = entryModule;\n' +
          '  }\n\n' +
          '  // Return entry point exports (for other environments)\n' +
          '  return entryModule;\n})();',
      };
  }
}

/** The map of code that moved down by `lines` lines. */
export function shiftSourceMap(map: RawSourceMap, lines: number): RawSourceMap {
  return { ...map, mappings: ';'.repeat(lines) + map.mappings };
}
