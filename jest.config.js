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
  ],
};

// Node.js 23+ compatibility settings
if (nodeVersion >= 23) {
  baseConfig.extensionsToTreatAsEsm = [];
  baseConfig.globals = {
    'ts-jest': {
      useESM: false,
      isolatedModules: true,
    },
  };
  baseConfig.transform = {
    '^.+\\.ts$': [
      'ts-jest',
      {
        isolatedModules: true,
        useESM: false,
      },
    ],
  };
  baseConfig.moduleFileExtensions = ['ts', 'js'];
  baseConfig.transformIgnorePatterns = ['node_modules/(?!(.*\\.mjs$))'];
}

module.exports = baseConfig;
