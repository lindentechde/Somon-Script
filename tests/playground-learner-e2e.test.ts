/* eslint-env browser */
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

import { compile } from '../src/browser';
import { buildCliOnce, canonicalTmpDir } from './helpers/paths';

/**
 * The playground for learners (playground/, built by
 * scripts/build-playground.js into one HTML file): its build, its examples,
 * and the page in headless Chromium, opened from disk (file://) as a teacher
 * would open it from a USB stick. The browser tests are skipped when
 * playwright-core or Chromium is missing (set PLAYWRIGHT_BROWSERS_PATH).
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildPlayground, MAX_BYTES } = require('../scripts/build-playground.js');

type Chromium = typeof import('playwright-core').chromium;
type Browser = import('playwright-core').Browser;
type Page = import('playwright-core').Page;

function findChromium(): { chromium?: Chromium; reason?: string } {
  let chromium: Chromium;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    chromium = require('playwright-core').chromium;
  } catch {
    return { reason: 'playwright-core is not installed' };
  }
  const executable = chromium.executablePath();
  if (!executable || !fs.existsSync(executable)) {
    return { reason: `Chromium is not installed (looked for ${executable || 'a browser'})` };
  }
  return { chromium };
}

const EXAMPLES_DIR = path.join(__dirname, '..', 'playground', 'examples');
const MANIFEST: Array<{ id: string; file: string; expectErrors?: boolean; input?: string }> =
  JSON.parse(fs.readFileSync(path.join(EXAMPLES_DIR, 'examples.json'), 'utf8'));

describe('playground build', () => {
  let html: string;

  beforeAll(() => {
    buildCliOnce();
    html = buildPlayground().html;
  }, 120000);

  test('is one file, smaller than the limit, and the same on every build', () => {
    expect(Buffer.byteLength(html)).toBeLessThanOrEqual(MAX_BYTES);
    expect(MAX_BYTES).toBe(1.5 * 1024 * 1024);
    expect(buildPlayground().html).toBe(html);
  });

  test('loads nothing from the network', () => {
    expect(html).not.toMatch(/<script[^>]+src=/i);
    expect(html).not.toMatch(/<link[^>]+href=/i);
    expect(html).not.toMatch(/@import|url\(\s*['"]?https?:/i);
  });

  test('has 10 to 15 examples; each compiles, but the one with a mistake', () => {
    expect(MANIFEST.length).toBeGreaterThanOrEqual(10);
    expect(MANIFEST.length).toBeLessThanOrEqual(15);
    for (const example of MANIFEST) {
      const source = fs.readFileSync(path.join(EXAMPLES_DIR, example.file), 'utf8');
      const result = compile(source, { language: 'tj' });
      expect([example.id, result.errors.length > 0]).toEqual([
        example.id,
        Boolean(example.expectErrors),
      ]);
    }
  });
});

const { chromium, reason } = findChromium();
const describeInBrowser = chromium ? describe : describe.skip;
if (!chromium) {
  console.warn(`Skipping the playground browser tests: ${reason}`);
}

describeInBrowser(`playground for learners in Chromium${chromium ? '' : ` (skipped)`}`, () => {
  let dir: string;
  let pageUrl: string;
  let browser: Browser;
  let page: Page;
  let pageErrors: string[];
  let requests: string[];

  beforeAll(async () => {
    buildCliOnce();
    dir = canonicalTmpDir('somon-playground-');
    const file = path.join(dir, 'index.html');
    fs.writeFileSync(file, buildPlayground().html);
    pageUrl = pathToFileURL(file).href;
    browser = await chromium!.launch();
  }, 120000);

  afterAll(async () => {
    await browser?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    page = await browser.newPage();
    pageErrors = [];
    requests = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => requests.push(request.url()));
  });

  afterEach(async () => {
    await page.close();
    expect(pageErrors).toEqual([]);
    // Only the page itself and the worker's Blob URLs: nothing from the network
    expect(requests.filter(url => !/^(file|blob|data):/.test(url))).toEqual([]);
  });

  /** Clicks «Иҷро» and waits until the program is done. */
  async function run(): Promise<void> {
    await page.click('#run');
    await page.waitForFunction(
      () => !(document.getElementById('run') as HTMLButtonElement).disabled,
      null,
      { timeout: 20000 }
    );
  }

  const output = () => page.textContent('#output');

  test('a Tajik page: an example that reads the input sums two numbers', async () => {
    await page.goto(`${pageUrl}#example=jam`);
    expect(await page.textContent('#run')).toContain('Иҷро');
    expect(await page.textContent('h1')).toContain('Майдони озмоиш');
    expect(await page.inputValue('#input')).toBe('2\n3\n');
    // A link saves the page itself, for offline use
    expect(await page.getAttribute('#download', 'href')).toBe(pageUrl);
    expect(await page.getAttribute('#download', 'download')).toBe('somonscript.html');
    await run();
    expect(await output()).toBe('Ҷамъ: 5\n');
    expect(await page.textContent('#status')).toMatch(/^Иҷро шуд \(\d+ мс\)\.$/);
    // JavaScript is shown only when asked for
    expect(await page.isVisible('#js-panel')).toBe(false);
    await page.check('#show-js');
    expect(await page.textContent('#js')).toContain('console.log("Ҷамъ:", а + б);');
  }, 60000);

  test('a compile error in Tajik, its line marked in the editor', async () => {
    await page.goto(`${pageUrl}#example=khatoi-kompayl`);
    await run();
    const text = await output();
    expect(text).toContain('Хато дар сатри 3:');
    expect(text).toContain('Маслиҳат: Шояд `агар`-ро дар назар доштед?');
    expect(text).toContain('Барнома компайл нашуд: 1 хато.');
    expect(await page.textContent('#gutter .error')).toBe('3');
    expect(await page.locator('#marks .error').count()).toBe(1);
    // A click on the error selects its line
    await page.click('#output [data-line="3"]');
    const selected = await page.evaluate(() => {
      const code = document.getElementById('code') as HTMLTextAreaElement;
      return code.value.slice(code.selectionStart, code.selectionEnd);
    });
    expect(selected).toBe('агр (синну > 14) {');
  }, 60000);

  test('a run-time error in Tajik, on the line of the program', async () => {
    await page.goto(`${pageUrl}#example=jam`);
    await page.fill('#input', '2\nсе\n');
    await run();
    expect(await output()).toBe(
      [
        'Хатои иҷро дар сатри 3:',
        '  `се` рақам нест: `хонданиРақам()` рақам интизор буд.',
        '    3 | тағ б = хонданиРақам();',
        '      |         ^^^^^^^^^^^^',
        '  Маслиҳат: Дар ин сатри вуруд рақам нависед, масалан `42` ё `2,5`.',
        '',
      ].join('\n')
    );
    expect(await page.textContent('#gutter .error')).toBe('3');
  }, 60000);

  test('an endless loop is stopped after the time limit', async () => {
    await page.goto(`${pageUrl}?timeout=1#example=davrai-beokhir`);
    const started = Date.now();
    await run();
    expect(Date.now() - started).toBeLessThan(15000);
    const text = await output();
    expect(text).toContain('Натиҷа хеле дароз аст: танҳо 1000 сатри аввал нишон дода шуд.');
    expect(text.trimEnd().split('\n').pop()).toBe(
      'Барнома аз ҳад зиёд дароз кор кард — шояд давраи беохир?'
    );
    // The page still works
    await page.fill('#code', 'чоп("боз");');
    await run();
    expect(await output()).toBe('боз\n');
  }, 60000);

  test('a link keeps the program and its input; the editor keeps what was typed', async () => {
    await page.goto(pageUrl);
    await page.fill('#code', 'тағ ном = хондан("Ном: ");\nчоп("Салом, " + ном);');
    await page.fill('#input', 'Зарина');
    await page.click('#share');
    const link = page.url();
    expect(link).toContain('#c=');

    const other = await browser.newPage();
    await other.goto(link);
    expect(await other.inputValue('#code')).toBe(
      'тағ ном = хондан("Ном: ");\nчоп("Салом, " + ном);'
    );
    expect(await other.inputValue('#input')).toBe('Зарина');
    await other.click('#run');
    await other.waitForFunction(() => document.getElementById('output')!.textContent !== '');
    expect(await other.textContent('#output')).toBe('Ном: Салом, Зарина\n');
    await other.close();

    // Saved in the browser: a reload without the link shows it again
    await page.waitForTimeout(500);
    await page.goto(pageUrl);
    expect(await page.inputValue('#input')).toBe('Зарина');
  }, 60000);

  /** The playground link of a task page, with its tests (scripts/tutorial-links.js). */
  const taskLink = (id: string) => {
    const readme = fs.readFileSync(
      path.join(__dirname, '..', 'docs', 'tutorial', 'tasks', id, 'README.md'),
      'utf8'
    );
    return /\(https:\/\/lindentechde\.github\.io\/Somon-Script\/(#c=[^)]*&t=[^)]*)\)/.exec(
      readme
    )![1];
  };

  /** Clicks «Санҷидан» and waits until every test has run. */
  async function check(): Promise<string> {
    await page.click('#check');
    await page.waitForFunction(
      () => !(document.getElementById('check') as HTMLButtonElement).disabled,
      null,
      { timeout: 30000 }
    );
    return (await output())!;
  }

  test('a task link checks the program on every test of the task', async () => {
    await page.goto(pageUrl + taskLink('05-jam'));
    expect(await page.isVisible('#check')).toBe(true);
    expect(await page.textContent('#check')).toContain('Санҷидан');
    // The program of the link only says where to write
    expect(await check()).toContain('Санҷиши 1: нодуруст ✗\n   Вуруд:\n    2\n    3\n');
    await page.fill('#code', 'тағ а = хондан();\nтағ б = хондан();\nчоп(а + б);');
    const wrong = await check();
    expect(wrong).toContain('   Интизор буд:\n    5\n   Барнома чоп кард:\n    23\n');
    expect(wrong.trimEnd().split('\n').pop()).toBe('Натиҷа: 0 аз 3 санҷиш гузашт.');
    await page.fill('#code', 'тағ а = хонданиРақам();\nтағ б = хонданиРақам();\nчоп(а + б);');
    expect(await check()).toBe(
      [
        'Санҷиши 1: дуруст ✓',
        'Санҷиши 2: дуруст ✓',
        'Санҷиши 3: дуруст ✓',
        'Натиҷа: 3 аз 3 санҷиш гузашт.',
        '',
      ].join('\n')
    );
    expect(await page.locator('#output .pass').count()).toBe(4);
    // A program that does not compile is not checked
    await page.fill('#code', 'агр');
    const notCompiled = await check();
    expect(notCompiled).toContain('Барнома компайл нашуд: 1 хато.');
    expect(notCompiled).not.toContain('Санҷиши');
    // The link keeps the tests; an example has none
    await page.click('#share');
    expect(page.url()).toContain('&t=');
    await page.selectOption('#example', 'salom');
    expect(await page.isVisible('#check')).toBe(false);
  }, 90000);

  test('a check fails a test whose program runs too long, or fails, and can be stopped', async () => {
    await page.goto(`${pageUrl}?timeout=1&lang=ru${taskLink('01-salom')}`);
    expect(await page.textContent('#check')).toContain('Проверить');
    await page.fill('#code', 'то (дуруст) {}');
    const endless = await check();
    expect(endless).toContain('Тест 1: неверно ✗');
    expect(endless).toContain('Программа работала слишком долго');
    await page.fill('#code', 'чоп("Салом, ҷаҳон!");\nтағ о: ҳар = холӣ;\nчоп(о.х);');
    const failing = await check();
    expect(failing).toContain('   Программа вывела:\n    Салом, ҷаҳон!\n');
    expect(failing).toContain('Ошибка выполнения в строке 3:');
    expect(await page.textContent('#gutter .error')).toBe('3');
    // «Стоп» ends a check
    await page.fill('#code', 'то (дуруст) {}');
    await page.click('#check');
    await page.click('#stop');
    expect(await page.isEnabled('#check')).toBe(true);
    expect(await page.textContent('#status')).toBe('Программа остановлена.');
  }, 90000);

  test('the learning mode warns about beginner mistakes; it can be turned off', async () => {
    await page.goto(pageUrl);
    await page.fill('#code', 'тағ а = хондан();\nчоп(а + 1);');
    await page.fill('#input', '2');
    expect(await page.isChecked('#learning-mode')).toBe(true);
    await run();
    expect(await output()).toContain('`+` онро бо рақам ҷамъ намекунад, балки мепайвандад');
    expect(await output()).toContain('21');
    expect(await page.textContent('#gutter .warning')).toBe('2');
    await page.uncheck('#learning-mode');
    await run();
    expect(await output()).toBe('21\n');
  }, 60000);

  test('Russian and English pages, with messages in that language', async () => {
    await page.goto(`${pageUrl}?lang=ru#example=khatoi-kompayl`);
    expect(await page.textContent('#run')).toContain('Запустить');
    await run();
    expect(await output()).toContain('Программа не скомпилирована: 1 ошибка.');
    await page.selectOption('#language', 'en');
    expect(await page.textContent('#run')).toContain('Run');
  }, 60000);

  test('the editor highlights the language and indents new lines', async () => {
    await page.goto(pageUrl);
    await page.fill('#code', '');
    await page.click('#code');
    await page.keyboard.type('агар (дуруст) {');
    await page.keyboard.press('Enter');
    await page.keyboard.type('чоп(1);');
    expect(await page.inputValue('#code')).toBe('агар (дуруст) {\n  чоп(1);');
    expect(await page.textContent('#highlight .kw')).toBe('агар');
    expect(await page.textContent('#highlight .lit')).toBe('дуруст');
    expect(await page.textContent('#highlight .builtin')).toBe('чоп');
    expect(await page.textContent('#gutter')).toBe('1\n2');
    await page.keyboard.press('Control+Enter');
    await page.waitForFunction(() => document.getElementById('status')!.textContent !== '');
  }, 60000);

  test('fits a phone screen', async () => {
    const phone = await browser.newPage({ viewport: { width: 360, height: 740 } });
    await phone.goto(`${pageUrl}#example=zarb`);
    expect(await phone.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      360
    );
    await phone.close();
  }, 60000);
});
