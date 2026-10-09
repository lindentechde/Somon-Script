/**
 * ModuleSystem.watch() with a fake chokidar: what is watched with which
 * options, how events change the caches, errors of the watcher, and closing
 * watchers (also ones that fail or hang). A real watcher runs in
 * tests/e2e/modules-projects.test.ts.
 */
import { EventEmitter } from 'events';

class FakeWatcher extends EventEmitter {
  readonly closeMock = jest.fn((): Promise<void> => Promise.resolve());
  close = this.closeMock;
  /** Emit a chokidar event: chokidar emits it as 'all' too. */
  fire(event: string, filePath: string): void {
    this.emit(event, filePath);
    this.emit('all', event, filePath);
  }
}

const watchMock = jest.fn((_paths: string[], _options: unknown) => new FakeWatcher());
jest.mock('chokidar', () => ({ __esModule: true, default: { watch: watchMock } }));

import * as path from 'path';

import { ModuleSystem } from '../src/module-system';
import { moduleSystemLogger } from '../src/module-system/logger';
import { createTempProject, type TempProject } from './helpers/module-project';

describe('ModuleSystem.watch', () => {
  let project: TempProject;
  let system: ModuleSystem;

  beforeEach(() => {
    project = createTempProject('somon-ms-watch-');
    project.write({
      'leaf.som': 'содир собит Л = 1;\n',
      'lib/mid.som': 'ворид { Л } аз "../leaf";\nворид * чун фс аз "fs";\nсодир собит М = Л;\n',
      'main.som': 'ворид { М } аз "./lib/mid";\nчоп.сабт(М);\n',
    });
    system = new ModuleSystem({ resolution: { baseUrl: project.root } });
    watchMock.mockClear();
    jest.spyOn(moduleSystemLogger, 'info').mockImplementation(() => undefined);
    jest.spyOn(moduleSystemLogger, 'warn').mockImplementation(() => undefined);
    jest.spyOn(moduleSystemLogger, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    jest.useRealTimers();
    await system.shutdown();
    jest.restoreAllMocks();
    project.remove();
  });

  const file = (name: string) => project.file(name);
  const lastWatcher = (): FakeWatcher => watchMock.mock.results.at(-1)!.value;

  test('watches the entry, the registered modules and their directories', () => {
    system.loadModuleSync('./main', project.root);
    system.watch(file('main.som'), { additionalPaths: ['extra-dir'] });
    const [paths, options] = watchMock.mock.calls[0];
    expect([...paths].sort()).toEqual(
      [
        file('main.som'),
        project.root,
        file('lib/mid.som'),
        file('lib'),
        file('leaf.som'),
        path.resolve('extra-dir'),
      ].sort()
    );
    // 'fs' (an external module) has no file
    expect(paths).not.toContain('fs');
    expect(options).toEqual({
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 20 },
      ignored: /node_modules/,
    });
  });

  test('includeNodeModules and chokidarOptions change the options', () => {
    system.watch(file('main.som'), {
      includeNodeModules: true,
      chokidarOptions: { usePolling: true, ignoreInitial: false },
    });
    expect(watchMock.mock.calls[0][1]).toEqual({
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 20 },
      ignored: undefined,
      usePolling: true,
    });
  });

  test('change and unlink drop the file and its dependents; other events every module', () => {
    const events: unknown[] = [];
    system.loadModuleSync('./main', project.root);
    system.watch(file('main.som'), { onChange: event => events.push(event) });
    const watcher = lastWatcher();

    watcher.fire('change', path.relative(process.cwd(), file('lib/mid.som')));
    expect(system.getModule(file('lib/mid.som'))).toBeUndefined();
    expect(system.getModule(file('main.som'))).toBeUndefined();
    expect(system.getModule(file('leaf.som'))).toBeDefined();

    watcher.fire('unlink', file('leaf.som'));
    expect(system.getModule(file('leaf.som'))).toBeUndefined();

    for (const event of ['add', 'addDir', 'unlinkDir']) {
      system.loadModuleSync('./main', project.root);
      watcher.fire(event, file('new'));
      expect(system.getAllModules()).toEqual([]);
    }
    expect(events).toEqual([
      { type: 'change', filePath: file('lib/mid.som') },
      { type: 'unlink', filePath: file('leaf.som') },
      { type: 'add', filePath: file('new') },
      { type: 'addDir', filePath: file('new') },
      { type: 'unlinkDir', filePath: file('new') },
    ]);
  });

  test('events without onChange only update the caches', () => {
    system.loadModuleSync('./main', project.root);
    system.watch(file('main.som'));
    lastWatcher().fire('change', file('main.som'));
    expect(system.getModule(file('main.som'))).toBeUndefined();
  });

  test('a watcher error is logged and closes the watcher', async () => {
    system.watch(file('main.som'));
    const watcher = lastWatcher();
    watcher.emit('error', new Error('EMFILE: too many open files'));
    expect(moduleSystemLogger.error).toHaveBeenCalledWith('ModuleSystem watch error', {
      error: 'EMFILE: too many open files',
    });
    expect(watcher.closeMock).toHaveBeenCalledTimes(1);
    // Once closed, shutdown() does not close it again
    await new Promise(resolve => setImmediate(resolve));
    await system.shutdown();
    expect(watcher.closeMock).toHaveBeenCalledTimes(1);
    expect(moduleSystemLogger.info).not.toHaveBeenCalled();
  });

  test('a watcher that fails to close after an error is logged', async () => {
    system.watch(file('main.som'));
    const watcher = lastWatcher();
    watcher.closeMock.mockRejectedValueOnce(new Error('close failed'));
    watcher.emit('error', new Error('broken'));
    await new Promise(resolve => setImmediate(resolve));
    expect(moduleSystemLogger.warn).toHaveBeenCalledWith('Failed to close errored watcher', {
      error: 'close failed',
    });
  });

  test('a watcher its owner closed is not closed again', async () => {
    const watcher = system.watch(file('main.som'));
    await watcher.close();
    await system.stopWatching();
    expect(lastWatcher().closeMock).toHaveBeenCalledTimes(1);
  });

  test('shutdown closes every watcher and reports the ones that fail', async () => {
    system.watch(file('main.som'));
    const good = lastWatcher();
    system.watch(file('leaf.som'));
    const bad = lastWatcher();
    bad.closeMock.mockRejectedValueOnce(new Error('cannot close'));
    await system.shutdown();
    expect(good.closeMock).toHaveBeenCalledTimes(1);
    expect(bad.closeMock).toHaveBeenCalledTimes(1);
    expect(moduleSystemLogger.info).toHaveBeenCalledWith('Stopping all watchers', { count: 2 });
    expect(moduleSystemLogger.warn).toHaveBeenCalledWith('Failed to close module watcher', {
      error: 'cannot close',
    });
    expect(moduleSystemLogger.info).toHaveBeenLastCalledWith('All watchers stopped');
  });

  test('a watcher that does not close within 5 s is given up on', async () => {
    jest.useFakeTimers();
    system.watch(file('main.som'));
    lastWatcher().closeMock.mockImplementationOnce(() => new Promise<void>(() => undefined));
    const stopped = system.stopWatching();
    await jest.advanceTimersByTimeAsync(5000);
    await stopped;
    expect(moduleSystemLogger.warn).toHaveBeenCalledWith('Failed to close module watcher', {
      error: "Operation 'close module watcher' timed out after 5000ms",
    });
  });
});
