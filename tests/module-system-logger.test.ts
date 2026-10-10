import * as moduleSystem from '../src/module-system';
import * as asyncTimeout from '../src/module-system/async-timeout';
import {
  Logger,
  moduleLoaderLogger,
  moduleRegistryLogger,
  moduleResolverLogger,
  moduleSystemLogger,
} from '../src/module-system/logger';
import * as loader from '../src/module-system/module-loader';
import * as registry from '../src/module-system/module-registry';
import * as resolver from '../src/module-system/module-resolver';
import * as system from '../src/module-system/module-system';

/** The module system's logger and the exports of src/module-system/index.ts. */

describe('Logger', () => {
  let error: jest.SpyInstance;
  let warn: jest.SpyInstance;
  const debugSetting = process.env.SOMON_DEBUG;

  beforeEach(() => {
    error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (debugSetting === undefined) delete process.env.SOMON_DEBUG;
    else process.env.SOMON_DEBUG = debugSetting;
  });

  test('warnings and errors always go to stderr, with the component', () => {
    const logger = new Logger('тест');
    logger.warn('w');
    logger.warn('w2', { a: 1 });
    logger.error('e');
    logger.error('e2', new Error('x'), { b: 2 });
    logger.fatal('f');
    logger.fatal('f2', 'cause', 'more');
    expect(warn.mock.calls).toEqual([
      ['[тест]', 'w', ''],
      ['[тест]', 'w2', { a: 1 }],
    ]);
    expect(error.mock.calls).toEqual([
      ['[тест]', 'e', '', ''],
      ['[тест]', 'e2', new Error('x'), { b: 2 }],
      ['[тест]', 'FATAL', 'f', '', ''],
      ['[тест]', 'FATAL', 'f2', 'cause', 'more'],
    ]);
  });

  test('debug and info only with SOMON_DEBUG=1 or true; trace never', () => {
    const logger = new Logger('x');
    delete process.env.SOMON_DEBUG;
    logger.debug('d');
    logger.info('i');
    process.env.SOMON_DEBUG = 'yes';
    logger.debug('d');
    expect(error).not.toHaveBeenCalled();

    process.env.SOMON_DEBUG = '1';
    logger.debug('d', { m: 1 });
    logger.debug('d2');
    process.env.SOMON_DEBUG = 'true';
    logger.info('i');
    logger.trace('t', { m: 2 });
    expect(error.mock.calls).toEqual([
      ['[x]', 'DEBUG', 'd', { m: 1 }],
      ['[x]', 'DEBUG', 'd2', ''],
      ['[x]', 'INFO', 'i', ''],
    ]);
    expect(warn).not.toHaveBeenCalled();
  });

  test('the module system has a logger for each part', () => {
    moduleSystemLogger.warn('a');
    moduleLoaderLogger.warn('b');
    moduleRegistryLogger.warn('c');
    moduleResolverLogger.warn('d');
    expect(warn.mock.calls.map(call => call[0])).toEqual([
      '[module-system]',
      '[module-loader]',
      '[module-registry]',
      '[module-resolver]',
    ]);
  });
});

describe('src/module-system/index.ts', () => {
  test('exports the classes and helpers of the module system', () => {
    expect(moduleSystem).toMatchObject({
      ModuleResolver: resolver.ModuleResolver,
      ModuleLoader: loader.ModuleLoader,
      ModuleLoadError: loader.ModuleLoadError,
      ModuleRegistry: registry.ModuleRegistry,
      ModuleSystem: system.ModuleSystem,
      withTimeout: asyncTimeout.withTimeout,
      createTimeoutWrapper: asyncTimeout.createTimeoutWrapper,
      allWithTimeout: asyncTimeout.allWithTimeout,
      TimeoutError: asyncTimeout.TimeoutError,
      AggregateTimeoutError: asyncTimeout.AggregateTimeoutError,
      Logger,
    });
    expect(Object.keys(moduleSystem).sort()).toEqual(
      [
        'AggregateTimeoutError',
        'Logger',
        'ModuleLoadError',
        'ModuleLoader',
        'ModuleRegistry',
        'ModuleResolver',
        'ModuleSystem',
        'TimeoutError',
        'allWithTimeout',
        'createTimeoutWrapper',
        'withTimeout',
      ].sort()
    );
  });
});
