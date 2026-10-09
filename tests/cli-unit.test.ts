import * as fs from 'node:fs';
import packageJson from '../package.json';

// Mock the compile function
const mockCompile = jest.fn();
jest.mock('../src/compiler', () => ({
  compile: mockCompile,
}));

// Mock fs operations
jest.mock('node:fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock package.json reading for the program module
mockFs.existsSync.mockImplementation((filePath: string) => {
  if (typeof filePath === 'string' && filePath.endsWith('package.json')) {
    return true;
  }
  return false;
});

mockFs.readFileSync.mockImplementation((filePath: string) => {
  if (typeof filePath === 'string' && filePath.endsWith('package.json')) {
    return JSON.stringify({ name: packageJson.name, version: packageJson.version });
  }
  return '';
});

import { compileFile } from '../src/cli/program';

describe('CLI Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompile.mockReset();
    mockFs.existsSync.mockReset();
    mockFs.readFileSync.mockReset();
    mockFs.writeFileSync.mockReset();
    process.exitCode = 0;
  });

  describe('compileFile', () => {
    test('compileFile helper should process files', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('source');
      mockCompile.mockReturnValue({
        code: 'compiled',
        errors: [],
        warnings: [],
        sourceMap: undefined,
      });
      const result = compileFile('file.som', {});
      expect(result.code).toBe('compiled');
      expect(mockFs.readFileSync).toHaveBeenCalled();
      expect(mockCompile).toHaveBeenCalled();
    });

    test('compileFile helper should handle missing files', () => {
      mockFs.existsSync.mockReturnValue(false);
      const result = compileFile('missing.som', {});
      expect(result.errors.length).toBeGreaterThan(0);
      expect(process.exitCode).toBe(1);
    });

    test('compileFile prints warnings and keeps the exit code', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('source');
      mockCompile.mockReturnValue({ code: 'compiled', errors: [], warnings: ['unused х'] });
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        compileFile('file.som', {});
        expect(warn.mock.calls.map(call => String(call[0]))).toEqual(['Warnings:', '  unused х']);
        expect(process.exitCode).toBe(0);
      } finally {
        warn.mockRestore();
      }
    });

    test('compileFile reports compilation errors with exit code 1', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('source');
      mockCompile.mockReturnValue({ code: '', errors: ['Parse error'], warnings: [] });
      const error = jest.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const result = compileFile('file.som', {});
        expect(result.errors).toEqual(['Parse error']);
        expect(error.mock.calls.map(call => String(call[0]))).toContain('  Parse error');
        expect(process.exitCode).toBe(1);
      } finally {
        error.mockRestore();
      }
    });

    test.each([
      [{}, true],
      [{ typeCheck: false }, false],
      [{ noTypeCheck: true }, false],
    ])('compileFile with %j passes typeCheck=%s to the compiler', (options, typeCheck) => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('source');
      mockCompile.mockReturnValue({ code: 'compiled', errors: [], warnings: [] });
      compileFile('file.som', options);
      expect(mockCompile).toHaveBeenCalledWith('source', expect.objectContaining({ typeCheck }));
    });
  });
});
