// Jest setup file for SomonScript tests

// Set test environment
process.env.NODE_ENV = 'test';

// Ensure any CLI-set exit codes don't leak across tests and fail the Jest process
afterEach(() => {
  if (process.exitCode && process.exitCode !== 0) {
    process.exitCode = 0;
  }
});
