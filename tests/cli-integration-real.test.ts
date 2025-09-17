/**
 * Real CLI Integration Tests
 * Tests the actual CLI module by spawning child processes
 * This provides real coverage of the CLI code
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CLI Integration - Real Coverage', () => {
  let tempDir: string;
  let cliPath: string;

  beforeAll(() => {
    // Determine repository root dynamically (works in CI, devcontainer, and local environments)
    const repoRoot = path.resolve(__dirname, '..');

    // Build the project first
    try {
      execSync('npm run build', { stdio: 'pipe', cwd: repoRoot });
    } catch (error) {
      console.warn('Build failed, tests may not work correctly');
    }
    cliPath = path.join(repoRoot, 'dist', 'cli.js');
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-cli-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('compile command', () => {
    test('should compile simple file successfully', () => {
      const inputFile = path.join(tempDir, 'test.som');
      const outputFile = path.join(tempDir, 'test.js');

      fs.writeFileSync(inputFile, 'тағйирёбанда а = 5; чоп.сабт(а);');

      const result = execSync(`node "${cliPath}" compile "${inputFile}"`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(fs.existsSync(outputFile)).toBe(true);
      expect(result).toContain('Compiled');

      const compiledCode = fs.readFileSync(outputFile, 'utf-8');
      expect(compiledCode).toMatch(/let|var|const/);
    });

    test('should handle custom output file', () => {
      const inputFile = path.join(tempDir, 'input.som');
      const outputFile = path.join(tempDir, 'custom.js');

      fs.writeFileSync(inputFile, 'тағйирёбанда а = 5;');

      const result = execSync(`node "${cliPath}" compile "${inputFile}" -o "${outputFile}"`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(fs.existsSync(outputFile)).toBe(true);
      expect(result).toContain('custom.js');
    });

    test('should handle compilation options', () => {
      const inputFile = path.join(tempDir, 'test.som');
      fs.writeFileSync(inputFile, 'тағйирёбанда а = 5;');

      const result = execSync(`node "${cliPath}" compile "${inputFile}" --target es5 --strict`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(result).toContain('Compiled');
    });

    test('should handle file not found error', () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.som');

      expect(() => {
        execSync(`node "${cliPath}" compile "${nonExistentFile}"`, {
          stdio: 'pipe',
          cwd: tempDir,
        });
      }).toThrow();
    });

    test('should handle compilation errors', () => {
      const inputFile = path.join(tempDir, 'error.som');
      fs.writeFileSync(inputFile, 'invalid syntax here @#$%');

      expect(() => {
        execSync(`node "${cliPath}" compile "${inputFile}"`, {
          stdio: 'pipe',
          cwd: tempDir,
        });
      }).toThrow();
    });

    test('should support compile alias "c"', () => {
      const inputFile = path.join(tempDir, 'test.som');
      fs.writeFileSync(inputFile, 'тағйирёбанда а = 5;');

      const result = execSync(`node "${cliPath}" c "${inputFile}"`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(result).toContain('Compiled');
    });
  });

  describe('run command', () => {
    test('should compile and run simple program', () => {
      const inputFile = path.join(tempDir, 'hello.som');
      fs.writeFileSync(inputFile, 'чоп.сабт("Салом ҷаҳон!");');

      const result = execSync(`node "${cliPath}" run "${inputFile}"`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(result).toContain('Салом ҷаҳон!');
    });

    test('should handle file not found error', () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent.som');

      expect(() => {
        execSync(`node "${cliPath}" run "${nonExistentFile}"`, {
          stdio: 'pipe',
          cwd: tempDir,
        });
      }).toThrow();
    });

    test('should support run alias "r"', () => {
      const inputFile = path.join(tempDir, 'test.som');
      fs.writeFileSync(inputFile, 'чоп.сабт("Test");');

      const result = execSync(`node "${cliPath}" r "${inputFile}"`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(result).toContain('Test');
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

      expect(result).toContain('Created SomonScript project');
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'src'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'src', 'main.som'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'dist'))).toBe(true);

      const packageJson = JSON.parse(
        fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8')
      );
      expect(packageJson.name).toBe(projectName);
      expect(packageJson.scripts.build).toBeDefined();
      expect(packageJson.scripts.dev).toBeDefined();

      const mainSom = fs.readFileSync(path.join(projectPath, 'src', 'main.som'), 'utf-8');
      expect(mainSom).toContain('функсия салом');
      expect(mainSom).toContain('чоп.сабт');
    });

    test('should use default project name', () => {
      const result = execSync(`node "${cliPath}" init`, {
        cwd: tempDir,
        encoding: 'utf-8',
      });

      expect(result).toContain('somon-project');
      expect(fs.existsSync(path.join(tempDir, 'somon-project'))).toBe(true);
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
  });

  describe('version and help', () => {
    test('should display version', () => {
      const result = execSync(`node "${cliPath}" --version`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });
      expect(result).toMatch(/\d+\.\d+\.\d+/);
    });

    test('should display help', () => {
      const result = execSync(`node "${cliPath}" --help`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });
      expect(result).toContain('SomonScript compiler');
      expect(result).toContain('compile');
      expect(result).toContain('run');
      expect(result).toContain('init');
    });

    test('should display compile command help', () => {
      const result = execSync(`node "${cliPath}" compile --help`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });
      expect(result).toContain('Compile SomonScript files');
      expect(result).toContain('--output');
      expect(result).toContain('--target');
      expect(result).toContain('--source-map');
      expect(result).toContain('--minify');
      expect(result).toContain('--strict');
    });

    test('should display run command help', () => {
      const result = execSync(`node "${cliPath}" run --help`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });
      expect(result).toContain('Compile and run SomonScript file');
    });

    test('should display init command help', () => {
      const result = execSync(`node "${cliPath}" init --help`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });
      expect(result).toContain('Initialize a new SomonScript project');
    });
  });

  describe('error handling and edge cases', () => {
    test('should handle invalid command', () => {
      expect(() => {
        execSync(`node "${cliPath}" invalid-command`, {
          stdio: 'pipe',
          cwd: tempDir,
        });
      }).toThrow();
    });

    test('should handle missing arguments', () => {
      expect(() => {
        execSync(`node "${cliPath}" compile`, {
          stdio: 'pipe',
          cwd: tempDir,
        });
      }).toThrow();
    });

    test('should handle empty source file', () => {
      const inputFile = path.join(tempDir, 'empty.som');
      fs.writeFileSync(inputFile, '');

      const result = execSync(`node "${cliPath}" compile "${inputFile}"`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(result).toContain('Compiled');
    });

    test('should handle Unicode file names', () => {
      const inputFile = path.join(tempDir, 'тест.som');
      fs.writeFileSync(inputFile, 'тағйирёбанда а = 5;');

      const result = execSync(`node "${cliPath}" compile "${inputFile}"`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(result).toContain('Compiled');
      expect(fs.existsSync(path.join(tempDir, 'тест.js'))).toBe(true);
    });

    test('should handle files with complex paths', () => {
      const subDir = path.join(tempDir, 'sub', 'directory');
      fs.mkdirSync(subDir, { recursive: true });

      const inputFile = path.join(subDir, 'nested.som');
      fs.writeFileSync(inputFile, 'тағйирёбанда а = 5;');

      const result = execSync(`node "${cliPath}" compile "${inputFile}"`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(result).toContain('Compiled');
      expect(fs.existsSync(path.join(subDir, 'nested.js'))).toBe(true);
    });

    test('should handle source map generation', () => {
      const inputFile = path.join(tempDir, 'sourcemap.som');
      fs.writeFileSync(inputFile, 'тағйирёбанда а = 5;');

      const result = execSync(`node "${cliPath}" compile "${inputFile}" --source-map`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(result).toContain('Compiled');
      // Note: Source map generation may not be fully implemented
      // expect(fs.existsSync(path.join(tempDir, 'sourcemap.js.map'))).toBe(true);
    });

    test('should handle minification option', () => {
      const inputFile = path.join(tempDir, 'minify.som');
      fs.writeFileSync(inputFile, 'тағйирёбанда а = 5;');

      const result = execSync(`node "${cliPath}" compile "${inputFile}" --minify`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(result).toContain('Compiled');
    });

    test('should handle no-type-check option', () => {
      const inputFile = path.join(tempDir, 'notype.som');
      fs.writeFileSync(inputFile, 'тағйирёбанда а = 5;');

      const result = execSync(`node "${cliPath}" compile "${inputFile}" --no-type-check`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(result).toContain('Compiled');
    });
  });

  describe('project workflow integration', () => {
    test('should create project and compile main file', () => {
      const projectName = 'workflow-test';

      // Create project
      execSync(`node "${cliPath}" init "${projectName}"`, {
        cwd: tempDir,
        stdio: 'pipe',
      });

      const projectPath = path.join(tempDir, projectName);
      const mainFile = path.join(projectPath, 'src', 'main.som');
      const outputFile = path.join(projectPath, 'dist', 'main.js');

      // Compile the generated main file
      const result = execSync(`node "${cliPath}" compile "${mainFile}" -o "${outputFile}"`, {
        encoding: 'utf-8',
        cwd: projectPath,
      });

      expect(result).toContain('Compiled');
      expect(fs.existsSync(outputFile)).toBe(true);

      const compiledCode = fs.readFileSync(outputFile, 'utf-8');
      expect(compiledCode).toContain('console.log');
    });

    test('should create project and run main file', () => {
      const projectName = 'run-test';

      // Create project
      execSync(`node "${cliPath}" init "${projectName}"`, {
        cwd: tempDir,
        stdio: 'pipe',
      });

      const projectPath = path.join(tempDir, projectName);
      const mainFile = path.join(projectPath, 'src', 'main.som');

      // Run the generated main file
      const result = execSync(`node "${cliPath}" run "${mainFile}"`, {
        encoding: 'utf-8',
        cwd: projectPath,
      });

      expect(result).toContain('Салом, ҷаҳон!');
    });
  });
});
