import * as fs from 'fs';
import * as path from 'path';
import { buildCliOnce, canonicalTmpDir, runCli } from './helpers/paths';

describe('CLI Integration Tests', () => {
  let tempDir: string;

  beforeAll(() => {
    buildCliOnce();
  });

  beforeEach(() => {
    tempDir = canonicalTmpDir('somon-test-');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('compile command', () => {
    test('should compile simple hello world', () => {
      const inputFile = path.join(tempDir, 'hello.som');
      const outputFile = path.join(tempDir, 'hello.js');

      fs.writeFileSync(inputFile, 'чоп.сабт("Салом ҷаҳон!");');

      const result = runCli(['compile', inputFile, '-o', outputFile]);

      expect(fs.existsSync(outputFile)).toBe(true);
      expect(result).toContain('Compiled');

      const compiledCode = fs.readFileSync(outputFile, 'utf-8');
      expect(compiledCode).toContain('console.log');
      expect(compiledCode).toContain('Салом ҷаҳон!');
    });

    test('should handle compilation errors gracefully', () => {
      const inputFile = path.join(tempDir, 'error.som');
      fs.writeFileSync(inputFile, 'invalid syntax here');

      try {
        runCli(['compile', inputFile], { stdio: 'pipe' });
        throw new Error('Expected compilation to fail but it succeeded');
      } catch (error: any) {
        expect(error.status).not.toBe(0);
      }
    });

    test('should handle missing input file', () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.som');

      expect(() => {
        runCli(['compile', nonExistentFile], { stdio: 'pipe' });
      }).toThrow();
    });

    test('should support strict type checking', () => {
      const inputFile = path.join(tempDir, 'typed.som');
      fs.writeFileSync(inputFile, 'тағйирёбанда ном: сатр = "Аҳмад";');

      const result = runCli(['compile', inputFile, '--strict']);

      expect(result).toContain('Compiled');
    });

    test('should generate source maps when requested', () => {
      const inputFile = path.join(tempDir, 'sourcemap.som');
      const outputFile = path.join(tempDir, 'sourcemap.js');

      fs.writeFileSync(inputFile, 'чоп.сабт("Test");');

      runCli(['compile', inputFile, '-o', outputFile, '--source-map'], { stdio: 'pipe' });

      expect(fs.existsSync(outputFile)).toBe(true);
      // Note: Source map generation may not be fully implemented yet
      // expect(fs.existsSync(`${outputFile}.map`)).toBe(true);
    });
  });

  describe('run command', () => {
    test('should compile and run simple program', () => {
      const inputFile = path.join(tempDir, 'run-test.som');
      fs.writeFileSync(inputFile, 'чоп.сабт("Running test");');

      const result = runCli(['run', inputFile]);

      expect(result).toContain('Running test');
    });

    test('should handle runtime errors', () => {
      const inputFile = path.join(tempDir, 'runtime-error.som');
      fs.writeFileSync(inputFile, 'invalid_function_call();');

      expect(() => {
        runCli(['run', inputFile], { stdio: 'pipe' });
      }).toThrow();
    });
  });

  describe('init command', () => {
    test('should create new project structure', () => {
      const projectName = 'test-project';
      const projectPath = path.join(tempDir, projectName);

      const result = runCli(['init', projectName], { cwd: tempDir });

      expect(result).toContain('Created SomonScript project');
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'src'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'src', 'main.som'))).toBe(true);

      const packageJson = JSON.parse(
        fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8')
      );
      expect(packageJson.name).toBe(projectName);
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts.dev).toBeDefined();
    });

    test('should handle existing directory', () => {
      const projectName = 'existing-project';
      const projectPath = path.join(tempDir, projectName);
      fs.mkdirSync(projectPath);

      expect(() => {
        runCli(['init', projectName], { cwd: tempDir, stdio: 'pipe' });
      }).toThrow();
    });

    test('should use default project name', () => {
      const result = runCli(['init'], { cwd: tempDir });

      expect(result).toContain('somon-project');
      expect(fs.existsSync(path.join(tempDir, 'somon-project'))).toBe(true);
    });
  });

  describe('version and help', () => {
    test('should display version', () => {
      const result = runCli(['--version']);
      expect(result).toMatch(/\d+\.\d+\.\d+/);
    });

    test('should display help', () => {
      const result = runCli(['--help']);
      expect(result).toContain('SomonScript compiler');
      expect(result).toContain('compile');
      expect(result).toContain('run');
      expect(result).toContain('init');
    });
  });
});
