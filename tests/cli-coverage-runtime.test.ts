/**
 * `cliRuntime.executeCompiledFile`, which `somon run` uses to start the
 * compiled program: the child's arguments, working directory, exit status and
 * signal, the forwarding of termination signals, and spawn failures. Also the
 * lookup of the CLI's package.json when the program module loads.
 */
import type { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

import { canonicalTmpDir } from './helpers/paths';

const mockSpawn = jest.fn();
jest.mock('node:child_process', () => {
  const actual = jest.requireActual('node:child_process');
  return { ...actual, spawn: (...args: unknown[]) => mockSpawn(...args) };
});

import { cliRuntime } from '../src/cli/program';

const { spawn: realSpawn } = jest.requireActual('node:child_process');

jest.setTimeout(30000);

let dir: string;

beforeEach(() => {
  dir = canonicalTmpDir('somon-cli-runtime-');
  mockSpawn.mockReset().mockImplementation(realSpawn);
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function script(name: string, code: string): string {
  const file = path.join(dir, name);
  fs.writeFileSync(file, code);
  return file;
}

const FORWARDED = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;
const listenerCounts = (): number[] => FORWARDED.map(signal => process.listenerCount(signal));

describe('cliRuntime.executeCompiledFile', () => {
  test('runs the file with Node and resolves with its exit status', async () => {
    const before = listenerCounts();
    const result = await cliRuntime.executeCompiledFile(script('exit.js', 'process.exit(7);'));
    expect(result).toEqual({ status: 7, signal: null });
    // The signal handlers are removed once the program has finished.
    expect(listenerCounts()).toEqual(before);
  });

  test('passes the program its arguments, working directory and --enable-source-maps', async () => {
    const report = path.join(dir, 'report.json');
    const file = script(
      'report.js',
      'require("fs").writeFileSync(process.argv[2], JSON.stringify({' +
        ' argv: process.argv.slice(3), cwd: process.cwd(), execArgv: process.execArgv }));'
    );
    const cwd = fs.mkdtempSync(path.join(dir, 'cwd-'));
    const result = await cliRuntime.executeCompiledFile(file, [report, 'а', '--б'], {
      cwd,
      enableSourceMaps: true,
    });
    expect(result).toEqual({ status: 0, signal: null });
    expect(JSON.parse(fs.readFileSync(report, 'utf8'))).toEqual({
      argv: ['а', '--б'],
      cwd: fs.realpathSync.native(cwd),
      execArgv: ['--enable-source-maps'],
    });
    expect(mockSpawn).toHaveBeenCalledWith(
      process.execPath,
      ['--enable-source-maps', file, report, 'а', '--б'],
      expect.objectContaining({ stdio: 'inherit', cwd })
    );
  });

  test('adds variables to the environment of the program', async () => {
    const report = path.join(dir, 'env.json');
    const file = script(
      'env.js',
      'require("fs").writeFileSync(process.argv[2], JSON.stringify(process.env.SOMON_RUN_LANGUAGE));'
    );
    const result = await cliRuntime.executeCompiledFile(file, [report], {
      env: { SOMON_RUN_LANGUAGE: 'tj' },
    });
    expect(result).toEqual({ status: 0, signal: null });
    expect(JSON.parse(fs.readFileSync(report, 'utf8'))).toBe('tj');
  });

  test('forwards termination signals to the program', async () => {
    const before = FORWARDED.map(signal => process.listeners(signal));
    const running = cliRuntime.executeCompiledFile(
      script('wait.js', 'setInterval(() => {}, 1000);')
    );
    const added = FORWARDED.map(
      (signal, index) => process.listeners(signal).filter(l => !before[index].includes(l))[0]
    );
    expect(added.every(listener => typeof listener === 'function')).toBe(true);
    (added[1] as (signal: string) => void)('SIGTERM');
    const result = await running;
    expect(result.status).toBeNull();
    expect(result.signal).toBe('SIGTERM');
    expect(FORWARDED.map(signal => process.listeners(signal))).toEqual(before);
  });

  test('a program that cannot be started resolves with the error', async () => {
    const result = await cliRuntime.executeCompiledFile(script('x.js', ''), [], {
      cwd: path.join(dir, 'missing'),
    });
    expect(result.status).toBeNull();
    expect(result.signal).toBeNull();
    expect(result.error?.message).toMatch(/ENOENT/);
  });

  test('settles once, and survives a child that cannot receive the signal', async () => {
    const child = Object.assign(new EventEmitter(), {
      kill: jest.fn(() => {
        throw new Error('ESRCH');
      }),
    });
    mockSpawn.mockReturnValueOnce(child as unknown as ChildProcess);
    const before = FORWARDED.map(signal => process.listeners(signal));
    const running = cliRuntime.executeCompiledFile('/nowhere.js');
    const forward = process.listeners('SIGINT').find(l => !before[0].includes(l)) as (
      signal: string
    ) => void;
    expect(() => forward('SIGINT')).not.toThrow();
    expect(child.kill).toHaveBeenCalledWith('SIGINT');

    const failure = new Error('spawn EACCES');
    child.emit('error', failure);
    // Node may emit 'exit' after 'error'; the first event decides.
    child.emit('exit', 1, null);
    await expect(running).resolves.toEqual({ status: null, signal: null, error: failure });
  });
});

describe('package.json lookup', () => {
  test('loading the program fails clearly when no package.json can be found', () => {
    jest.isolateModules(() => {
      jest.doMock('node:fs', () => ({
        ...jest.requireActual('node:fs'),
        existsSync: () => false,
      }));
      expect(() => require('../src/cli/program')).toThrow('package.json not found');
    });
    jest.dontMock('node:fs');
  });
});
