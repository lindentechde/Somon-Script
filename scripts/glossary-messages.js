#!/usr/bin/env node
/**
 * Writes the messages of the diagnostics catalog (src/diagnostics) into
 * docs/glossary.tj.md, between the `messages` markers: every message and hint
 * in Tajik, Russian and English, with the sample values of
 * tests/helpers/diagnostic-samples.ts. `--check` only compares, and exits 1
 * when the glossary is out of date (the tests run it).
 *
 * Usage: node scripts/glossary-messages.js [--check]   (after `npm run build`)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GLOSSARY = path.join(ROOT, 'docs', 'glossary.tj.md');
const START = '<!-- messages:start -->';
const END = '<!-- messages:end -->';

/** The samples, a TypeScript module that imports only types. */
function loadSamples() {
  const ts = require('typescript');
  const file = path.join(ROOT, 'tests', 'helpers', 'diagnostic-samples.ts');
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  new Function('module', 'exports', 'require', outputText)(module, module.exports, require);
  return module.exports;
}

/** A table cell: `|` escaped, on one line. */
function cell(text) {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/** The section between the markers. */
function messagesSection() {
  const diagnostics = require(path.join(ROOT, 'dist', 'diagnostics'));
  const { SAMPLES, HINT_SAMPLES } = loadSamples();
  const rows = (render, ids, paramsOf) =>
    ids.map(id => {
      const msg = { id, params: paramsOf(id) };
      const texts = ['tj', 'ru', 'en'].map(language => cell(render(msg, language)));
      return `| \`${id}\` | ${texts.join(' | ')} |`;
    });
  const header = ['| Код | Тоҷикӣ | Русский | English |', '| --- | --- | --- | --- |'];
  return [
    START,
    '',
    '### Паёмҳо (Сообщения / Messages)',
    '',
    ...header,
    ...rows(diagnostics.renderMessage, diagnostics.MESSAGE_IDS, id => SAMPLES[id][0]),
    '',
    '### Маслиҳатҳо (Подсказки / Hints)',
    '',
    ...header,
    ...rows(diagnostics.renderHint, diagnostics.HINT_IDS, id => HINT_SAMPLES[id]),
    '',
    END,
  ].join('\n');
}

/** Table rows as cells, so that a formatter's alignment does not count. */
function normalize(text) {
  return text
    .split('\n')
    .map(line =>
      line.startsWith('|')
        ? line
            .split(/(?<!\\)\|/)
            .map(part => part.trim())
            .join('|')
            .replace(/\|-+(?=\|)/g, '|---')
        : line.trim()
    )
    .filter(line => line !== '')
    .join('\n');
}

function main(argv) {
  const glossary = fs.readFileSync(GLOSSARY, 'utf8');
  const start = glossary.indexOf(START);
  const end = glossary.indexOf(END);
  if (start === -1 || end === -1) throw new Error(`${GLOSSARY} has no ${START} … ${END} section`);
  const current = glossary.slice(start, end + END.length);
  const section = messagesSection();
  if (argv.includes('--check')) {
    if (normalize(current) !== normalize(section)) {
      console.error('docs/glossary.tj.md is out of date: run node scripts/glossary-messages.js');
      process.exitCode = 1;
    }
    return;
  }
  fs.writeFileSync(GLOSSARY, glossary.slice(0, start) + section + glossary.slice(end + END.length));
  console.log('✅ docs/glossary.tj.md');
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { messagesSection, normalize };
