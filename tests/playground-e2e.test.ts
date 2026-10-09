/* eslint-env browser */
import * as fs from 'fs';
import * as http from 'http';
import type { AddressInfo } from 'net';
import * as path from 'path';

import { buildCliOnce } from './helpers/paths';

/**
 * The playground (docs/playground/index.html) in headless Chromium through
 * playwright-core. Skipped when playwright-core or the browser is missing
 * (Chromium is not downloaded by these tests; set PLAYWRIGHT_BROWSERS_PATH).
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildBrowserBundle } = require('../scripts/build-browser.js');

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

const { chromium, reason } = findChromium();
const describeInBrowser = chromium ? describe : describe.skip;
if (!chromium) {
  console.warn(`Skipping the playground browser tests: ${reason}`);
}

const PLAYGROUND = path.join(__dirname, '..', 'docs', 'playground', 'index.html');

describeInBrowser(`playground in Chromium${chromium ? '' : ` (skipped: ${reason})`}`, () => {
  let server: http.Server;
  let baseUrl: string;
  let browser: Browser;
  let page: Page;
  let pageErrors: string[];

  beforeAll(async () => {
    buildCliOnce();
    const bundle: string = buildBrowserBundle().code;
    server = http.createServer((request, response) => {
      const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
      if (pathname === '/' || pathname === '/index.html') {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end(fs.readFileSync(PLAYGROUND));
      } else if (pathname === '/somonscript.js') {
        response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
        response.end(bundle);
      } else {
        response.writeHead(404);
        response.end();
      }
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    browser = await chromium!.launch();
  }, 60000);

  afterAll(async () => {
    await browser?.close();
    await new Promise(resolve => server?.close(resolve));
  });

  beforeEach(async () => {
    page = await browser.newPage();
    pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
  });

  afterEach(async () => {
    await page.close();
    expect(pageErrors).toEqual([]);
  });

  async function open(query = '?lang=tj'): Promise<void> {
    await page.goto(`${baseUrl}/${query}`);
    await page.waitForSelector('body[data-ready="true"]');
  }

  async function runProgram(code: string): Promise<void> {
    await page.fill('#source', code);
    await page.click('#run');
    await page.waitForFunction(
      () => !(document.getElementById('run') as HTMLButtonElement).disabled
    );
  }

  const consoleText = () => page.textContent('#console');
  const errorsText = () => page.textContent('#errors');

  test('runs the first example and prints to the console panel', async () => {
    await open();
    expect(await page.inputValue('#source')).toContain('чоп.сабт(`Салом, ${ном}!`)');
    await page.click('#run');
    await page.waitForFunction(() =>
      document.getElementById('console')!.textContent!.includes('Салом, ҷаҳон!')
    );
    expect(await page.textContent('#output-js')).toContain('console.log(`Салом, ${ном}!`)');
    expect(await errorsText()).toBe('');
    expect(await page.textContent('#status')).toMatch(/мс/);
  }, 30000);

  test('compiles edited code, formats values and keeps the output panels apart', async () => {
    await open();
    await runProgram(
      'собит р = [1, 2, 3].харита(н => н * 2);\nчоп.сабт(р, { ном: "Алӣ" }, нав Map([["а", 1]]));\nчоп.хато("бад");'
    );
    const lines = await page.$$eval('#console > div', elements =>
      elements.map(element => [element.className, element.textContent])
    );
    expect(lines).toEqual([
      ['log', "[ 2, 4, 6 ] { ном: 'Алӣ' } Map(1) { 'а' => 1 }"],
      ['error', 'бад'],
    ]);
    expect(await page.textContent('#output-js')).toContain('[1, 2, 3].map((н) => н * 2)');
  }, 30000);

  test('shows type, syntax and runtime errors', async () => {
    await open();
    await runProgram('тағ синну: рақам = "сӣ";\nчоп.сабт(синну);');
    expect(await errorsText()).toContain('TYPE_NOT_ASSIGNABLE');
    // Without strict mode the program still runs
    expect(await consoleText()).toBe('сӣ');

    await page.check('#strict');
    await runProgram('тағ синну: рақам = "сӣ";\nчоп.сабт(синну);');
    expect(await consoleText()).toBe('');
    expect(await page.textContent('#output-js')).toBe('');

    await page.uncheck('#strict');
    await runProgram('тағ = 1;');
    expect(await errorsText()).toContain('Parse error');

    await runProgram('чоп.сабт("пеш");\nпартофтан нав Хато("афтод");');
    expect(await consoleText()).toContain('пеш');
    expect(await consoleText()).toContain('Error: афтод');
    expect(await errorsText()).toContain('афтод');
  }, 30000);

  test('picks examples, including asynchronous ones', async () => {
    await open();
    const names = await page.$$eval('#example option', options =>
      options.map(option => option.textContent)
    );
    expect(names.length).toBeGreaterThanOrEqual(8);
    const asyncIndex = names.findIndex(name => name === 'Ҳамзамон (async)');
    await page.selectOption('#example', String(asyncIndex));
    expect(await page.inputValue('#source')).toContain('ҳамзамон функсия асосӣ');
    await page.click('#run');
    await page.waitForFunction(() =>
      document.getElementById('console')!.textContent!.includes('Баъд аз 200 мс')
    );
    expect(await consoleText()).toBe('ОғозБаъд аз 200 мс');
  }, 30000);

  test('switches the interface language', async () => {
    await open('?lang=en');
    expect(await page.textContent('#run')).toBe('Run');
    expect(await page.textContent('#example option')).toBe('Hello, world!');
    await page.selectOption('#locale', 'ru');
    expect(await page.textContent('#run')).toBe('Запустить');
    expect(await page.getAttribute('html', 'lang')).toBe('ru');
    await page.selectOption('#locale', 'tj');
    expect(await page.textContent('#run')).toBe('Иҷро');
    expect(await page.textContent('#example option')).toBe('Салом, ҷаҳон!');
    expect(await page.getAttribute('html', 'lang')).toBe('tg');
    // The choice is remembered (a ?lang= parameter would win over it)
    await page.selectOption('#locale', 'ru');
    await open('');
    expect(await page.textContent('#run')).toBe('Запустить');
  }, 30000);

  test('loads TypeScript only when lowering needs it', async () => {
    const requested: string[] = [];
    await page.route('**/typescript.js', route => {
      requested.push(route.request().url());
      return route.fulfill({
        path: require.resolve('typescript/lib/typescript.js'),
        contentType: 'text/javascript',
      });
    });
    await open();
    await runProgram('тағ а = 2 ** 3;\nчоп.сабт(а);');
    expect(requested).toEqual([]);

    await page.selectOption('#target', 'es5');
    await runProgram('тағ а = 2 ** 3;\nчоп.сабт(а);');
    expect(requested).toHaveLength(1);
    expect(await page.textContent('#output-js')).toContain('var а = Math.pow(2, 3);');
    expect(await consoleText()).toBe('8');
  }, 60000);
});
