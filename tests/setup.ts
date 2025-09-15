// Jest setup file for SomonScript tests

// Set test environment
process.env.NODE_ENV = 'test';

// Extend Jest matchers if needed
declare global {
  namespace jest {
    interface Matchers<R> {
      toCompileSuccessfully(): R;
      toHaveTypeError(): R;
      toGenerateValidJS(): R;
    }
  }

  var testUtils: {
    createTempFile: (
      content: string,
      extension?: string
    ) => {
      path: string;
      cleanup: () => void;
    };
  };
}

// Export to make this file a module
export {};

// Custom matchers for SomonScript testing
expect.extend({
  toCompileSuccessfully(received: any) {
    const pass = received.errors.length === 0 && received.code.length > 0;

    if (pass) {
      return {
        message: () => `Expected compilation to fail, but it succeeded`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected compilation to succeed, but got errors: ${received.errors.join(', ')}`,
        pass: false,
      };
    }
  },

  toHaveTypeError(received: any) {
    const pass = received.errors.some((error: string) => error.includes('Type error'));

    if (pass) {
      return {
        message: () => `Expected no type errors, but found: ${received.errors.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected type error, but none found. Errors: ${received.errors.join(', ')}`,
        pass: false,
      };
    }
  },

  toGenerateValidJS(received: string) {
    try {
      // Basic syntax check - try to parse as JavaScript
      new Function(received);
      return {
        message: () => `Expected invalid JavaScript, but code is valid`,
        pass: true,
      };
    } catch (error) {
      return {
        message: () => `Expected valid JavaScript, but got syntax error: ${error}`,
        pass: false,
      };
    }
  },
});

// Global test utilities
(global as any).testUtils = {
  createTempFile: (content: string, extension = '.som') => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const tempFile = path.join(os.tmpdir(), `test_${Date.now()}${extension}`);
    fs.writeFileSync(tempFile, content, 'utf8');

    return {
      path: tempFile,
      cleanup: () => {
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // Ignore cleanup errors
        }
      },
    };
  },
};

// Console setup for cleaner test output
const originalConsoleError = console.error;
console.error = (...args) => {
  // Suppress expected error messages during tests
  const message = args.join(' ');
  if (message.includes('Type error') || message.includes('Compilation errors')) {
    return; // Suppress expected compilation errors in tests
  }
  originalConsoleError.apply(console, args);
};

// Ensure any CLI-set exit codes don't leak across tests and fail the Jest process
afterEach(() => {
  if (process.exitCode && process.exitCode !== 0) {
    process.exitCode = 0;
  }
});
