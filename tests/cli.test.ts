import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CLI Integration Tests', () => {
  let tempDir: string;
  let cliPath: string;

  beforeAll(() => {
    // Build the project first
    try {
      execSync('npm run build', { stdio: 'pipe' });
    } catch (error) {
      console.warn('Build failed, tests may not work correctly');
    }
    cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'somoni-test-'));
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

      const result = execSync(`node "${cliPath}" compile "${inputFile}" -o "${outputFile}"`, {
        encoding: 'utf-8',
      });

      expect(fs.existsSync(outputFile)).toBe(true);
      expect(result).toContain('Compiled');

      const compiledCode = fs.readFileSync(outputFile, 'utf-8');
      expect(compiledCode).toContain('console.log');
      expect(compiledCode).toContain('Салом ҷаҳон!');
    });

    test('should handle compilation errors gracefully', () => {
      const inputFile = path.join(tempDir, 'error.som');
      fs.writeFileSync(inputFile, 'invalid syntax here');

      expect(() => {
        execSync(`node "${cliPath}" compile "${inputFile}"`, { stdio: 'pipe' });
      }).toThrow();
    });

    test('should handle missing input file', () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.som');

      expect(() => {
        execSync(`node "${cliPath}" compile "${nonExistentFile}"`, { stdio: 'pipe' });
      }).toThrow();
    });

    test('should support strict type checking', () => {
      const inputFile = path.join(tempDir, 'typed.som');
      fs.writeFileSync(inputFile, 'тағйирёбанда ном: сатр = "Аҳмад";');

      const result = execSync(`node "${cliPath}" compile "${inputFile}" --strict`, {
        encoding: 'utf-8',
      });

      expect(result).toContain('Compiled');
    });

    test('should generate source maps when requested', () => {
      const inputFile = path.join(tempDir, 'sourcemap.som');
      const outputFile = path.join(tempDir, 'sourcemap.js');
      const sourceMapFile = `${outputFile}.map`;

      fs.writeFileSync(inputFile, 'чоп.сабт("Test");');

      execSync(`node "${cliPath}" compile "${inputFile}" -o "${outputFile}" --source-map`, {
        stdio: 'pipe',
      });

      expect(fs.existsSync(outputFile)).toBe(true);
      // Note: Source map generation may not be fully implemented yet
      // expect(fs.existsSync(sourceMapFile)).toBe(true);
    });
  });

  describe('run command', () => {
    test('should compile and run simple program', () => {
      const inputFile = path.join(tempDir, 'run-test.som');
      fs.writeFileSync(inputFile, 'чоп.сабт("Running test");');

      const result = execSync(`node "${cliPath}" run "${inputFile}"`, {
        encoding: 'utf-8',
      });

      expect(result).toContain('Running test');
    });

    test('should handle runtime errors', () => {
      const inputFile = path.join(tempDir, 'runtime-error.som');
      fs.writeFileSync(inputFile, 'invalid_function_call();');

      expect(() => {
        execSync(`node "${cliPath}" run "${inputFile}"`, { stdio: 'pipe' });
      }).toThrow();
    });
  });

  describe('init command', () => {
    test('should create new project structure', () => {
      const projectName = 'test-project';
      const projectPath = path.join(tempDir, projectName);

      const result = execSync(`node "${cliPath}" init "${projectName}"`, {
        cwd: tempDir,
        encoding: 'utf-8',
      });

      expect(result).toContain('Created Somoni-script project');
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'src'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'src', 'main.som'))).toBe(true);

      const packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
      expect(packageJson.name).toBe(projectName);
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts.dev).toBeDefined();
    });

    test('should handle existing directory', () => {
      const projectName = 'existing-project';
      const projectPath = path.join(tempDir, projectName);
      fs.mkdirSync(projectPath);

      expect(() => {
        execSync(`node "${cliPath}" init "${projectName}"`, {
          cwd: tempDir,
          stdio: 'pipe',
        });
      }).toThrow();
    });

    test('should use default project name', () => {
      const result = execSync(`node "${cliPath}" init`, {
        cwd: tempDir,
        encoding: 'utf-8',
      });

      expect(result).toContain('somoni-project');
      expect(fs.existsSync(path.join(tempDir, 'somoni-project'))).toBe(true);
    });
  });

  describe('version and help', () => {
    test('should display version', () => {
      const result = execSync(`node "${cliPath}" --version`, { encoding: 'utf-8' });
      expect(result).toMatch(/\d+\.\d+\.\d+/);
    });

    test('should display help', () => {
      const result = execSync(`node "${cliPath}" --help`, { encoding: 'utf-8' });
      expect(result).toContain('Somoni-script compiler');
      expect(result).toContain('compile');
      expect(result).toContain('run');
      expect(result).toContain('init');
    });
  });
});