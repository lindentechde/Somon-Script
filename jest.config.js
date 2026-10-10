const nodeVersion = Number.parseInt(process.version.slice(1).split('.')[0]);

const baseConfig = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  // The suite covers 99.9% of lines and 99.5% of branches (on Linux); the margin
  // leaves room for the few paths that differ by platform
  coverageThreshold: {
    global: {
      branches: 98,
      functions: 99,
      lines: 99,
      statements: 99,
    },
  },
  testTimeout: 10000,
  verbose: true,
  maxWorkers: 1,
  // Run the test files in a worker process that is replaced once its heap passes
  // this size, instead of all of them in one long-lived process: the run creates
  // hundreds of vm contexts and TypeScript programs, whose native memory took a
  // single process past 2 GB and Node.js 24 on macOS to occasional segfaults.
  workerIdleMemoryLimit: '300MB',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/types.ts', // Re-export file
    // Exclude the thin Node entry wrapper; we cover CLI logic via program tests
    '!src/cli.ts',
    // Loaded by the programs `somon run` starts; src/runtime/node.ts is what it runs
    '!src/runtime/node-prelude.ts',
    // The playground's Web Worker entry; tests/playground-learner-e2e.test.ts runs it in Chromium
    '!src/playground/worker.ts',
  ],
  // Modern ts-jest configuration without deprecated globals
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: false,
      },
    ],
  },
};

// Node.js 23+ compatibility settings
if (nodeVersion >= 23) {
  baseConfig.extensionsToTreatAsEsm = [];
  // transform already defined above; keep same options for Node 23+
  baseConfig.moduleFileExtensions = ['ts', 'js'];
  baseConfig.transformIgnorePatterns = ['node_modules/(?!(.*\\.mjs$))'];
}

module.exports = baseConfig;
