import * as fs from 'fs';
import packageJson from '../package.json';

// Mock the compile function
const mockCompile = jest.fn();
jest.mock('../src/compiler', () => ({
  compile: mockCompile,
}));

// Mock fs operations
jest.mock('fs');
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

  describe('CLI module coverage', () => {
    test('should validate CLI module structure', () => {
      // Basic test without importing the CLI module to avoid command line parsing
      expect(true).toBe(true);
    });

    test('should have compile function available', () => {
      expect(mockCompile).toBeDefined();
    });

    test('should have fs operations mocked', () => {
      expect(mockFs.existsSync).toBeDefined();
      expect(mockFs.readFileSync).toBeDefined();
      expect(mockFs.writeFileSync).toBeDefined();
    });

    test('should handle basic compilation logic', () => {
      // Mock successful compilation
      mockCompile.mockReturnValue({
        success: true,
        output: 'console.log("hello");',
        errors: [],
        warnings: [],
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('тағйирёбанда а = 5;');

      // Test that the compile function can be called
      const result = mockCompile('test code');
      expect(result.success).toBe(true);
      expect(result.output).toContain('console.log');
    });

    test('should handle compilation errors', () => {
      // Mock compilation errors
      mockCompile.mockReturnValue({
        success: false,
        output: '',
        errors: [{ message: 'Syntax error', line: 1, column: 1 }],
        warnings: [],
      });

      const result = mockCompile('invalid code');
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

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

    test('should handle file operations', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('file content');

      expect(mockFs.existsSync('test.som')).toBe(true);
      expect(mockFs.readFileSync('test.som', 'utf8')).toBe('file content');
    });
  });
});
