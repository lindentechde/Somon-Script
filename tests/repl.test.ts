import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PassThrough } from 'stream';
import {
  DEFAULT_REPL_MESSAGES,
  Repl,
  historyFileFromEnv,
  isIncomplete,
  prepareScript,
} from '../src/tools/repl';

/** Runs a scripted session and returns everything it printed. */
async function session(
  lines: string[],
  options: Partial<ConstructorParameters<typeof Repl>[0]> = {}
): Promise<string> {
  const input = new PassThrough();
  const output = new PassThrough();
  let printed = '';
  output.on('data', chunk => (printed += chunk.toString()));
  const repl = new Repl({ input, output, prompt: '> ', continuationPrompt: '. ', ...options });
  const done = repl.start();
  for (const line of lines) input.write(`${line}\n`);
  input.end();
  await done;
  return printed;
}

/** The lines a session printed, without prompts. */
function results(printed: string): string[] {
  return printed
    .split('\n')
    .map(line => line.replace(/^(?:[>.] )+/, ''))
    .filter(line => line !== '');
}

describe('isIncomplete', () => {
  test.each([
    ['функсия ф() {', true],
    ['ф(1,', true],
    ['тағ а = [', true],
    ['тағ х =', true],
    ['агар (а) {} вагарна', true],
    ['тағ с = `сатр', true],
    ['/* шарҳ', true],
    ['тағ а = 1;', false],
    ['а + б', false],
    ['тағ с = "кушода', false],
    ['ф())', false],
    ['тағ = 1', false],
  ])('%s → %s', (source, expected) => {
    expect(isIncomplete(source)).toBe(expected);
  });
});

describe('historyFileFromEnv', () => {
  test('defaults to ~/.somon_repl_history, can be moved and turned off', () => {
    expect(historyFileFromEnv({}, '/home/ali')).toBe(path.join('/home/ali', '.somon_repl_history'));
    expect(historyFileFromEnv({ SOMON_REPL_HISTORY: '/tmp/h' })).toBe('/tmp/h');
    expect(historyFileFromEnv({ SOMON_REPL_HISTORY: '' })).toBeUndefined();
    expect(historyFileFromEnv({ SOMON_REPL_HISTORY: '  ' })).toBeUndefined();
    expect(historyFileFromEnv({})).toContain('.somon_repl_history');
  });
});

describe('prepareScript', () => {
  test('turns top-level declarations into session variables', () => {
    const { code, async } = prepareScript('let а = 1;\nconst { б } = о;\nclass К {}\nа;', true);
    expect(async).toBe(false);
    expect(code).toContain('var а = 1;');
    expect(code).toContain('var { б } = о;');
    expect(code).toContain('var К = class К {};');
  });

  test('wraps top-level await, hoisting declarations and returning the last value', () => {
    const { code, async } = prepareScript(
      'const а = await ф();\nlet [б, в] = г;\nconst { д } = е;\nfunction ж() {}\nclass З {}\nа + б;',
      true
    );
    expect(async).toBe(true);
    expect(code).toMatch(/^var а, б, в, д, З;/);
    expect(code).toContain('function ж() {}\n(async () => {');
    expect(code).toContain('а = await ф();');
    expect(code).toContain('[б, в] = г;');
    expect(code).toContain('({ д } = е);');
    expect(code).toContain('З = class З {};');
    expect(code).toContain('return (а + б);');
  });

  test('await inside functions is not top-level', () => {
    expect(prepareScript('async function ф() { await 1; }', false).async).toBe(false);
    expect(prepareScript('for await (const х of у) {}', false).async).toBe(true);
    expect(prepareScript('let а;', false).code).toBe('var а;');
  });
});

describe('Repl.evaluate', () => {
  function repl(): Repl {
    return new Repl({ input: new PassThrough(), output: new PassThrough() });
  }

  test('declarations stay visible in later inputs', async () => {
    const r = repl();
    await r.evaluate('тағ х = 2;');
    await r.evaluate('собит у = 3;');
    await r.evaluate('функсия ф(а: рақам) { бозгашт а * х; }');
    await r.evaluate('синф К { н = 7; }');
    expect(await r.evaluate('ф(у) + нав К().н')).toEqual({ errors: [], hasValue: true, value: 13 });
  });

  test('names may be declared again', async () => {
    const r = repl();
    await r.evaluate('тағ х = 1;');
    await r.evaluate('собит х = 5;');
    await r.evaluate('синф К {}');
    expect((await r.evaluate('синф К { а = 1; }')).errors).toEqual([]);
    expect((await r.evaluate('х')).value).toBe(5);
  });

  test('top-level интизор', async () => {
    const r = repl();
    await r.evaluate('собит а = интизор Ваъда.resolve(20);');
    expect((await r.evaluate('интизор Ваъда.resolve(а + 1)')).value).toBe(21);
    expect((await r.evaluate('а * 2')).value).toBe(40);
    const failed = await r.evaluate('интизор Ваъда.reject(нав Хато("бад"))');
    expect(failed.errors).toEqual(['бад']);
  });

  test('reports compile and runtime errors', async () => {
    const r = repl();
    expect((await r.evaluate('тағ = 1')).errors[0]).toContain('Parse error');
    expect((await r.evaluate('номаълум()')).errors).toEqual([
      'ReferenceError: номаълум is not defined',
    ]);
    expect((await r.evaluate('партофтан 42')).errors).toEqual(['42']);
  });

  test('calls without a result print nothing', async () => {
    const r = repl();
    expect((await r.evaluate('чоп.сабт("салом")')).hasValue).toBe(false);
    expect((await r.evaluate('[1, 2].харита(х => х * 2)')).value).toEqual([2, 4]);
    expect((await r.evaluate('тағ з = 1;')).hasValue).toBe(false);
  });

  test('reset forgets declarations', async () => {
    const r = repl();
    await r.evaluate('тағ х = 1;');
    expect(r.lastCompiledCode).toBe('let х = 1;');
    r.reset();
    expect(r.lastCompiledCode).toBeUndefined();
    expect((await r.evaluate('навъи х')).value).toBe('undefined');
  });
});

describe('Repl session', () => {
  test('prints values, continues open inputs and runs commands', async () => {
    const printed = await session([
      'тағ х = 5;',
      'х + 1',
      'функсия ф(а: рақам) {',
      '  бозгашт а * 2;',
      '}',
      'ф(х)',
      'чоп.сабт("салом", х)',
      '`сатри',
      'дуюм`',
      '.js',
      '.ёрӣ',
      'номаълум()',
      '',
      '.пок',
      'навъи х',
      '.баромад',
      'чоп.сабт("набояд")',
    ]);
    const lines = results(printed);
    expect(lines[0]).toBe(DEFAULT_REPL_MESSAGES.banner);
    expect(lines).toContain('6');
    expect(lines).toContain('10');
    expect(lines).toContain('салом 5');
    expect(lines).toContain("'сатри\\nдуюм'");
    expect(lines).toContain('`сатри');
    expect(lines).toContain('дуюм`;');
    expect(printed).toContain(DEFAULT_REPL_MESSAGES.help);
    expect(lines).toContain('Error: ReferenceError: номаълум is not defined');
    expect(lines).toContain(DEFAULT_REPL_MESSAGES.cleared);
    expect(lines).toContain("'undefined'");
    expect(printed).not.toContain('набояд');
    expect(printed).toContain('. '); // the continuation prompt
  });

  test('English commands, .js before any input and localized messages', async () => {
    const printed = await session(['.js', '.help', '.clear', '.exit'], {
      messages: { noCompiledCode: 'Ҳеҷ чиз', help: 'ЁРӢ', cleared: 'ТОЗА', banner: 'САЛОМ' },
    });
    expect(results(printed)).toEqual(['САЛОМ', 'Ҳеҷ чиз', 'ЁРӢ', 'ТОЗА']);
  });

  test('Ctrl+C clears the input, a second one ends the session', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    let printed = '';
    output.on('data', chunk => (printed += chunk.toString()));
    const r = new Repl({ input, output, prompt: '> ', continuationPrompt: '. ' });
    const done = r.start();
    input.write('функсия ф() {\n');
    await new Promise(resolve => setImmediate(resolve));
    const interrupt = (r as unknown as { interrupt(): void }).interrupt.bind(r);
    interrupt();
    input.write('1 + 1\n');
    await new Promise(resolve => setImmediate(resolve));
    interrupt();
    interrupt();
    await done;
    expect(printed).toContain(DEFAULT_REPL_MESSAGES.exitHint);
    expect(results(printed)).toContain('2');
  });

  test('keeps a history file in terminal mode', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-repl-'));
    const historyFile = path.join(dir, 'history');
    fs.writeFileSync(historyFile, 'тағ кӯҳна = 1;\n');
    try {
      await session(['тағ нав1 = 2;', '.exit'], { terminal: true, historyFile });
      const history = fs.readFileSync(historyFile, 'utf8');
      expect(history).toContain('тағ нав1 = 2;');
      expect(history).toContain('тағ кӯҳна = 1;');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test('an unwritable history file does not stop the session', async () => {
    const printed = await session(['1 + 2'], {
      terminal: true,
      historyFile: path.join(os.tmpdir(), 'missing-dir-for-somon', 'nested', 'history'),
    });
    expect(printed).toContain('3');
  });
});
