'use strict';

/**
 * Lets a plain Node.js process require the repository's TypeScript sources
 * (src/ and tests/helpers/): each `.ts` file is transpiled to CommonJS with
 * TypeScript when it is loaded. The project compiles with `isolatedModules`,
 * so file-by-file transpilation gives the same code as `tsc`.
 *
 * Used by the worker processes of the differential test
 * (tests/helpers/differential-worker.js).
 */
const fs = require('fs');
const ts = require('typescript');

const compilerOptions = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022,
  esModuleInterop: true,
  inlineSourceMap: true,
};

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, { fileName: filename, compilerOptions });
  module._compile(outputText, filename);
};
