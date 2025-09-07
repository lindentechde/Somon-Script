const nodeVersion = parseInt(process.version.slice(1).split('.')[0]);

const baseConfig = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 55,
      functions: 75,
      lines: 68,
      statements: 68,
    },
  },
  testTimeout: 10000,
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/types.ts', // Re-export file
    // Exclude non-runtime architectural/demo modules from coverage to keep metrics meaningful
    '!src/core/**',
    '!src/architecture-demo.ts',
    '!src/domain.ts',
    '!src/modular-lexer-compatible.ts',
    // Exclude the thin Node entry wrapper; we cover CLI logic via program tests
    '!src/cli.ts',
  ],
  // Modern ts-jest configuration without deprecated globals
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        isolatedModules: true,
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
