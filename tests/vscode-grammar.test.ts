import * as fs from 'fs';
import * as path from 'path';

import { compile } from '../src/compiler';
import { KEYWORDS } from '../src/keyword-map';
import { CONTEXTUAL_KEYWORDS } from '../src/lsp/keywords';

/**
 * The VS Code extension in editors/vscode: its TextMate grammar is loaded with
 * the engine VS Code uses (vscode-textmate + vscode-oniguruma, which typedoc
 * already depends on) and sample programs are tokenized.
 */

const EXTENSION = path.join(__dirname, '..', 'editors', 'vscode');
const GRAMMAR_PATH = path.join(EXTENSION, 'syntaxes', 'somonscript.tmLanguage.json');
const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(EXTENSION, file), 'utf8'));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const vsctm = require('vscode-textmate');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const oniguruma = require('vscode-oniguruma');

interface Token {
  text: string;
  scopes: string[];
}

let grammar: any;

beforeAll(async () => {
  const wasm = fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm'));
  await oniguruma.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
  const registry = new vsctm.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (patterns: string[]) => new oniguruma.OnigScanner(patterns),
      createOnigString: (text: string) => new oniguruma.OnigString(text),
    }),
    loadGrammar: async (scopeName: string) =>
      scopeName === 'source.somonscript'
        ? vsctm.parseRawGrammar(fs.readFileSync(GRAMMAR_PATH, 'utf8'), GRAMMAR_PATH)
        : null,
  });
  grammar = await registry.loadGrammar('source.somonscript');
});

/** Tokens of a program, line by line, without the root scope and blank tokens. */
function tokenize(source: string): Token[][] {
  let stack = vsctm.INITIAL;
  return source.split(/\r?\n/).map(line => {
    const result = grammar.tokenizeLine(line, stack);
    stack = result.ruleStack;
    return result.tokens
      .map((token: any) => ({
        text: line.slice(token.startIndex, token.endIndex),
        scopes: token.scopes.slice(1),
      }))
      .filter((token: Token) => token.text.trim() !== '');
  });
}

/** The innermost scope of the first token with exactly this text. */
function scopeOf(source: string, text: string, occurrence = 1): string {
  const tokens = tokenize(source).flat();
  const found = tokens.filter(token => token.text === text)[occurrence - 1];
  if (!found) {
    throw new Error(`no token '${text}' in ${JSON.stringify(tokens.map(token => token.text))}`);
  }
  return found.scopes[found.scopes.length - 1] ?? '';
}

/** All scopes of the first token with exactly this text. */
function scopesOf(source: string, text: string): string[] {
  return tokenize(source)
    .flat()
    .find(token => token.text === text)!.scopes;
}

/** The rule stack depth after the program: 1 when every rule closed. */
function finalDepth(source: string): number {
  let stack = vsctm.INITIAL;
  for (const line of source.split(/\r?\n/)) stack = grammar.tokenizeLine(line, stack).ruleStack;
  return stack.depth;
}

/** Every regular expression of the grammar. */
function grammarRegexes(node: unknown, found: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach(item => grammarRegexes(item, found));
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (['match', 'begin', 'end', 'while'].includes(key) && typeof value === 'string') {
        found.push(value);
      } else {
        grammarRegexes(value, found);
      }
    }
  }
  return found;
}

describe('VS Code extension: TextMate grammar', () => {
  const rawGrammar = JSON.parse(fs.readFileSync(GRAMMAR_PATH, 'utf8'));

  test('is valid JSON with a scope name and patterns', () => {
    expect(rawGrammar.scopeName).toBe('source.somonscript');
    expect(rawGrammar.fileTypes).toEqual(['som']);
    expect(rawGrammar.patterns.length).toBeGreaterThan(0);
    expect(Object.keys(rawGrammar.repository).length).toBeGreaterThan(20);
  });

  test('every regular expression compiles with Oniguruma', () => {
    const regexes = grammarRegexes(rawGrammar);
    expect(regexes.length).toBeGreaterThan(50);
    for (const regex of regexes) {
      expect(() => new oniguruma.OnigScanner([regex])).not.toThrow();
    }
  });

  test('every include refers to a repository rule', () => {
    const includes = JSON.stringify(rawGrammar).match(/"include":"#[^"]+"/g) ?? [];
    for (const include of includes) {
      const name = include.slice('"include":"#'.length, -1);
      expect(rawGrammar.repository).toHaveProperty([name]);
    }
  });

  test('keywords', () => {
    const program = 'агар (х) { бозгашт 1; } вагарна { шикастан; }';
    expect(scopeOf(program, 'агар')).toBe('keyword.control.somonscript');
    expect(scopeOf(program, 'бозгашт')).toBe('keyword.control.somonscript');
    expect(scopeOf(program, 'вагарна')).toBe('keyword.control.somonscript');
    expect(scopeOf('тағ а = 1;', 'тағ')).toBe('storage.type.somonscript');
    expect(scopeOf('собит а = 1;', 'а')).toBe('variable.other.constant.somonscript');
    expect(scopeOf('функсия ф() {}', 'функсия')).toBe('storage.type.function.somonscript');
    expect(scopeOf('функсия ф() {}', 'ф')).toBe('entity.name.function.somonscript');
    expect(scopeOf('синф К мерос Б {}', 'К')).toBe('entity.name.type.class.somonscript');
    expect(scopeOf('синф К мерос Б {}', 'Б')).toBe('entity.other.inherited-class.somonscript');
    expect(scopeOf('ворид { а } аз "./м";', 'ворид')).toBe('keyword.control.import.somonscript');
    expect(scopeOf('х = дуруст;', 'дуруст')).toBe('constant.language.boolean.true.somonscript');
    expect(scopeOf('х = холӣ;', 'холӣ')).toBe('constant.language.null.somonscript');
    expect(scopeOf('ин.х = 1;', 'ин')).toBe('variable.language.this.somonscript');
    expect(scopeOf('статикӣ х = 1;', 'статикӣ')).toBe('storage.modifier.somonscript');
    // A keyword after a `.` is a property name
    expect(scopeOf('о.агар = 1;', 'агар')).toBe('variable.other.property.somonscript');
    // `...ин` spreads `this`
    expect(scopeOf('ф(...ин);', 'ин')).toBe('variable.language.this.somonscript');
  });

  test('contextual keywords in their positions', () => {
    expect(scopeOf('кун { и++; } то (и < 3);', 'кун')).toBe('keyword.control.loop.somonscript');
    expect(scopeOf('функсия* г() { ҳосил 1; }', 'ҳосил')).toBe('keyword.control.somonscript');
    expect(scopeOf('шумориш Ранг { Сурх }', 'шумориш')).toBe('storage.type.enum.somonscript');
    expect(scopeOf('шумориш Ранг { Сурх }', 'Ранг')).toBe('entity.name.type.enum.somonscript');
    expect(scopeOf('эълон модул "м" { }', 'эълон')).toBe('storage.modifier.somonscript');
    expect(scopeOf('эълон модул "м" { }', 'модул')).toBe('storage.type.namespace.somonscript');
    expect(scopeOf('эълон глобалӣ { }', 'глобалӣ')).toBe('storage.type.namespace.somonscript');
    expect(scopeOf('истифода р = ф();', 'истифода')).toBe('storage.type.somonscript');
    expect(scopeOf('синф К { бознавис м() {} }', 'бознавис')).toBe('storage.modifier.somonscript');
    expect(scopeOf('синф К { дастрасӣ х = 1; }', 'дастрасӣ')).toBe('storage.modifier.somonscript');
    expect(scopeOf('функсия ф<берун Т>() {}', 'берун')).toBe('storage.modifier.somonscript');
    // …and ordinary names elsewhere
    expect(scopeOf('берун: барои (;;) { шикастан берун; }', 'берун')).toBe(
      'entity.name.label.somonscript'
    );
    expect(scopeOf('шикастан берун;', 'берун')).toBe('variable.other.readwrite.somonscript');
    expect(scopeOf('тағ кун = 1;', 'кун')).toBe('variable.other.readwrite.somonscript');
  });

  test('strings, escapes and template literals', () => {
    const program = 'тағ а = "салом\\n" + \'ҷаҳон\' + `ном: ${ном.дарозӣ}`;';
    expect(scopeOf(program, 'салом')).toBe('string.quoted.double.somonscript');
    expect(scopeOf(program, '\\n')).toBe('constant.character.escape.somonscript');
    expect(scopeOf(program, 'ҷаҳон')).toBe('string.quoted.single.somonscript');
    expect(scopeOf(program, 'ном: ')).toBe('string.template.somonscript');
    expect(scopeOf(program, '${')).toBe(
      'punctuation.definition.template-expression.begin.somonscript'
    );
    const inner = scopesOf(program, 'ном');
    expect(inner).toContain('meta.template.expression.somonscript');
    expect(inner[inner.length - 1]).toBe('variable.other.readwrite.somonscript');
    expect(scopeOf(program, 'дарозӣ')).toBe('support.variable.property.somonscript');
    expect(scopeOf('собит у = "http://а.tj"; // шарҳ', 'http://а.tj')).toBe(
      'string.quoted.double.somonscript'
    );
    expect(scopeOf('сабт`ҳа`;', 'сабт')).toBe('entity.name.function.tagged-template.somonscript');
  });

  test('comments and the shebang', () => {
    const program = '#!/usr/bin/env somon\n// хат\n/* блок */\n/** ҳуҷҷат */\nтағ а = 1; // охир';
    expect(scopeOf(program, '/usr/bin/env somon')).toBe('comment.line.shebang.somonscript');
    expect(scopeOf(program, ' хат')).toBe('comment.line.double-slash.somonscript');
    expect(scopeOf(program, ' блок ')).toBe('comment.block.somonscript');
    expect(scopeOf(program, ' ҳуҷҷат ')).toBe('comment.block.documentation.somonscript');
    expect(scopeOf(program, ' охир')).toBe('comment.line.double-slash.somonscript');
  });

  test('numbers: separators, prefixes, exponents and bigint', () => {
    const program = 'тағ а = 1_000 + 0xFF_FF + 0b1010 + 0o17 + 1.5e-3 + 10n + 0x1Fn;';
    expect(scopeOf(program, '1_000')).toBe('constant.numeric.decimal.somonscript');
    expect(scopeOf(program, '0xFF_FF')).toBe('constant.numeric.hex.somonscript');
    expect(scopeOf(program, '0b1010')).toBe('constant.numeric.binary.somonscript');
    expect(scopeOf(program, '0o17')).toBe('constant.numeric.octal.somonscript');
    expect(scopesOf(program, '5e-3')).toContain('constant.numeric.decimal.somonscript');
    expect(scopeOf(program, '10')).toBe('constant.numeric.decimal.somonscript');
    expect(scopeOf(program, 'n')).toBe('storage.type.numeric.bigint.somonscript');
    expect(scopeOf(program, 'n', 2)).toBe('storage.type.numeric.bigint.somonscript');
    // Digits inside names are not numbers
    expect(scopeOf('тағ х2 = 1;', 'х2')).toBe('variable.other.readwrite.somonscript');
  });

  test('regular expressions and division', () => {
    const program = 'собит р = /а+[/\\]]б/gi;';
    expect(scopeOf(program, '/')).toBe('punctuation.definition.string.begin.somonscript');
    expect(scopesOf(program, 'а')).toContain('string.regexp.somonscript');
    expect(scopeOf(program, '+')).toBe('keyword.operator.quantifier.regexp.somonscript');
    expect(scopeOf(program, 'gi')).toBe('keyword.other.regex-flags.somonscript');
    expect(scopesOf(program, '[')).toContain(
      'constant.other.character-class.set.regexp.somonscript'
    );
    expect(scopeOf('агар (/^\\d+$/.test(с)) {}', '\\d')).toBe(
      'constant.character.escape.regexp.somonscript'
    );
    expect(scopeOf('бозгашт /х/;', 'х')).toBe('string.regexp.somonscript');
    // Divisions
    expect(scopeOf('тағ а = б / 2 / в;', '/')).toBe('keyword.operator.arithmetic.somonscript');
    expect(scopeOf('тағ а = (б + 1) / 2;', '/')).toBe('keyword.operator.arithmetic.somonscript');
    expect(scopeOf('а++ / 2;', '/')).toBe('keyword.operator.arithmetic.somonscript');
  });

  test('decorators, types and object literals', () => {
    expect(scopeOf('@ороиш\nсинф К {}', '@')).toBe('punctuation.decorator.somonscript');
    expect(scopeOf('@ороиш\nсинф К {}', 'ороиш')).toBe(
      'entity.name.function.decorator.somonscript'
    );
    expect(scopeOf('@а.б(1) м() {}', 'а.б')).toBe('entity.name.function.decorator.somonscript');

    const typed = 'функсия ф(х?: рақам | холӣ, к: Корбар): Ваъда<сатр[]> {}';
    expect(scopeOf(typed, 'рақам')).toBe('support.type.primitive.somonscript');
    expect(scopeOf(typed, '?')).toBe('keyword.operator.optional.somonscript');
    expect(scopeOf(typed, 'Корбар')).toBe('entity.name.type.somonscript');
    expect(scopesOf(typed, 'сатр')).toContain('meta.type.parameters.somonscript');
    expect(scopeOf('тағ т: қисмӣ<К>;', 'қисмӣ')).toBe('support.type.builtin.somonscript');
    expect(scopeOf('интерфейс И { ном: сатр; }', 'И')).toBe(
      'entity.name.type.interface.somonscript'
    );
    expect(scopeOf('интерфейс И { ном: сатр; }', 'ном')).toBe(
      'variable.object.property.somonscript'
    );
    expect(scopeOf('навъ Т = сатр | рақам;', 'Т')).toBe('entity.name.type.alias.somonscript');

    // `key: value` in an object literal is not a type annotation
    const object = 'собит о = { ном: "Алӣ", синну: х > 1 ? 2 : 3 };';
    expect(scopeOf(object, 'ном')).toBe('meta.object-literal.key.somonscript');
    expect(scopeOf(object, ':', 3)).toBe('keyword.operator.ternary.somonscript');
    expect(finalDepth(object)).toBe(1);
    expect(scopeOf('тағ ҳ = а ? б : в;', 'в')).toBe('variable.other.readwrite.somonscript');
    expect(scopeOf('ҳолат х: шикастан;', ':')).toBe('punctuation.separator.case.somonscript');
  });

  test('built-ins', () => {
    const program = 'чоп.сабт(рӯйхат.дарозӣ, Риёзӣ.ПИ, х.харита(ф));';
    expect(scopeOf(program, 'чоп')).toBe('support.class.builtin.somonscript');
    expect(scopeOf(program, 'сабт')).toBe('support.function.builtin.somonscript');
    expect(scopeOf(program, 'Риёзӣ')).toBe('support.class.builtin.somonscript');
    expect(scopeOf(program, 'харита')).toBe('support.function.builtin.somonscript');
    expect(scopeOf(program, 'ПИ')).toBe('variable.other.property.somonscript');
    expect(scopeOf('о.ҳисоб(1);', 'ҳисоб')).toBe('entity.name.function.somonscript');
  });

  test('every rule closes at the end of every example program', () => {
    const files: string[] = [];
    const walk = (dir: string) =>
      fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.som')) files.push(full);
      });
    walk(path.join(__dirname, '..', 'examples'));
    expect(files.length).toBeGreaterThan(50);
    for (const file of files) {
      expect([path.basename(file), finalDepth(fs.readFileSync(file, 'utf8'))]).toEqual([
        path.basename(file),
        1,
      ]);
    }
  });
});

describe('VS Code extension: keyword coverage', () => {
  /** Whether a keyword gets a keyword-like scope (not a plain name, not nothing). */
  function covered(source: string, word: string): boolean {
    const scope = scopeOf(source, word);
    return scope !== '' && !scope.startsWith('variable.other.readwrite');
  }

  test('every keyword the lexer knows is highlighted', () => {
    const missing = [...KEYWORDS.keys()].filter(word => !covered(`${word};`, word));
    expect(missing).toEqual([]);
  });

  test('every keyword of llm-guide/02-keywords.md is highlighted', () => {
    const guide = fs.readFileSync(
      path.join(__dirname, '..', 'llm-guide', '02-keywords.md'),
      'utf8'
    );
    const words = new Set<string>();
    for (const match of guide.matchAll(/^\| `([^`]+)`/gm)) {
      match[1].split(/\s+/).forEach(word => words.add(word));
    }
    expect(words.size).toBeGreaterThan(40);
    const missing = [...words].filter(word => !covered(`${word};`, word));
    expect(missing).toEqual([]);
  });

  test('every contextual keyword is highlighted in its position', () => {
    const contexts: Record<string, string> = {
      кун: 'кун { } то (х);',
      ҳосил: 'ҳосил 1;',
      шумориш: 'шумориш Р { А }',
      эълон: 'эълон собит х: рақам;',
      модул: 'эълон модул "м" { }',
      глобалӣ: 'эълон глобалӣ { }',
      истифода: 'истифода р = ф();',
      бознавис: 'бознавис м() { }',
      дастрасӣ: 'дастрасӣ х = 1;',
      берун: 'функсия ф<берун Т>() {}',
    };
    expect(Object.keys(contexts).sort()).toEqual([...CONTEXTUAL_KEYWORDS].sort());
    for (const [word, source] of Object.entries(contexts)) {
      expect([word, covered(source, word)]).toEqual([word, true]);
    }
  });

  test('the English TypeScript words SomonScript accepts are highlighted', () => {
    const contexts: Record<string, string> = {
      typeof: 'typeof х;',
      instanceof: 'х instanceof К;',
      satisfies: 'х satisfies Т;',
      declare: 'declare const х: рақам;',
      enum: 'enum Р { А }',
      using: 'using р = ф();',
      override: 'override м() {}',
      accessor: 'accessor х = 1;',
      yield: 'yield 1;',
      do: 'do { } то (х);',
      void: 'void 0;',
      delete: 'delete о.а;',
      debugger: 'debugger;',
      get: 'get х() {}',
      as: 'х as сатр;',
      is: 'функсия ф(х): х is сатр {}',
      asserts: 'функсия ф(х): asserts х {}',
      extends: 'синф А extends Б {}',
    };
    for (const [word, source] of Object.entries(contexts)) {
      expect([word, covered(source, word)]).toEqual([word, true]);
    }
  });
});

describe('VS Code extension: package', () => {
  const pkg = readJson('package.json');
  const rootPkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

  test('declares the somonscript language for .som files', () => {
    const [language] = pkg.contributes.languages;
    expect(language.id).toBe('somonscript');
    expect(language.extensions).toEqual(['.som']);
    expect(fs.existsSync(path.join(EXTENSION, language.configuration))).toBe(true);
    expect(pkg.activationEvents).toContain('onLanguage:somonscript');
  });

  test('the grammar contribution matches the grammar file', () => {
    const [contribution] = pkg.contributes.grammars;
    expect(contribution.language).toBe('somonscript');
    const file = path.join(EXTENSION, contribution.path);
    expect(path.resolve(file)).toBe(path.resolve(GRAMMAR_PATH));
    expect(JSON.parse(fs.readFileSync(file, 'utf8')).scopeName).toBe(contribution.scopeName);
  });

  test('snippets and the client entry exist; the client is not a root dependency', () => {
    const [snippets] = pkg.contributes.snippets;
    expect(snippets.language).toBe('somonscript');
    expect(fs.existsSync(path.join(EXTENSION, snippets.path))).toBe(true);
    expect(fs.existsSync(path.join(EXTENSION, pkg.main))).toBe(true);
    expect(pkg.dependencies).toHaveProperty('vscode-languageclient');
    expect(rootPkg.dependencies).not.toHaveProperty('vscode-languageclient');
    expect(rootPkg.devDependencies ?? {}).not.toHaveProperty('vscode-languageclient');
    expect(pkg.contributes.configuration.properties).toHaveProperty(['somonscript.server.path']);
  });

  test('language configuration: comments, brackets, autoclosing and indentation', () => {
    const config = readJson('language-configuration.json');
    expect(config.comments).toEqual({ lineComment: '//', blockComment: ['/*', '*/'] });
    expect(config.brackets).toEqual([
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ]);
    expect(config.autoClosingPairs.map((pair: any) => pair.open)).toEqual(
      expect.arrayContaining(['{', '[', '(', '"', "'", '`'])
    );
    const increase = new RegExp(config.indentationRules.increaseIndentPattern);
    const decrease = new RegExp(config.indentationRules.decreaseIndentPattern);
    expect(increase.test('функсия ф() {')).toBe(true);
    expect(increase.test('тағ а = 1;')).toBe(false);
    expect(decrease.test('    }')).toBe(true);
    // Words include Tajik letters
    const word = new RegExp(config.wordPattern, 'g');
    expect('тағ ҳисобҳо = 1;'.match(word)).toEqual(['тағ', 'ҳисобҳо', '1']);
    for (const rule of config.onEnterRules) expect(() => new RegExp(rule.beforeText)).not.toThrow();
  });

  test('every snippet expands to a program that compiles', () => {
    const snippets = readJson('snippets/somonscript.json') as Record<
      string,
      { body: string[]; prefix: string[] }
    >;
    for (const [name, snippet] of Object.entries(snippets)) {
      expect(snippet.prefix.length).toBeGreaterThan(0);
      // Placeholders take their default text; tab stops vanish
      let body = snippet.body.join('\n');
      for (let previous = ''; previous !== body; ) {
        previous = body;
        body = body.replace(/\$\{\d+:([^{}]*)\}/g, '$1');
      }
      body = body.replace(/\$\{\d+\}|\$\d+/g, '');
      const program = body.startsWith('(') ? `собит ф = ${body};` : body;
      expect([name, compile(program, { typeCheck: false }).errors]).toEqual([name, []]);
    }
  });
});
