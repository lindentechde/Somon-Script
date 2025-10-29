import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('CLI Run Command - Module Imports', () => {
  let tempDir: string;
  let cliPath: string;

  beforeAll(() => {
    // Build the project first
    execSync('npm run build', { stdio: 'pipe' });
    cliPath = path.join(__dirname, '..', 'dist', 'cli.js');
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'somon-run-modules-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('basic module imports', () => {
    test('should run file with single module import', () => {
      // Create a utility module
      const utilsFile = path.join(tempDir, 'utils.som');
      fs.writeFileSync(
        utilsFile,
        `содир функсия салом(ном: сатр): сатр {
    бозгашт "Салом, " + ном + "!";
}`
      );

      // Create main file that imports the utility
      const mainFile = path.join(tempDir, 'main.som');
      fs.writeFileSync(
        mainFile,
        `ворид { салом } аз "./utils";

чоп.сабт(салом("Ҷаҳон"));`
      );

      const result = execSync(`node "${cliPath}" run "${mainFile}"`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(result).toContain('Салом, Ҷаҳон!');
    });

    test('should run file with multiple module imports', () => {
      // Create math module
      const mathFile = path.join(tempDir, 'math.som');
      fs.writeFileSync(
        mathFile,
        `содир функсия ҷамъ(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}

содир функсия зарб(а: рақам, б: рақам): рақам {
    бозгашт а * б;
}`
      );

      // Create string module
      const stringFile = path.join(tempDir, 'string.som');
      fs.writeFileSync(
        stringFile,
        `содир функсия калон(матн: сатр): сатр {
    бозгашт матн.toUpperCase();
}`
      );

      // Create main file that imports from both modules
      const mainFile = path.join(tempDir, 'main.som');
      fs.writeFileSync(
        mainFile,
        `ворид { ҷамъ, зарб } аз "./math";
ворид { калон } аз "./string";

тағйирёбанда натиҷа = ҷамъ(5, 3);
чоп.сабт("5 + 3 = " + натиҷа);

тағйирёбанда натиҷа2 = зарб(4, 7);
чоп.сабт("4 × 7 = " + натиҷа2);

чоп.сабт(калон("тест"));`
      );

      const result = execSync(`node "${cliPath}" run "${mainFile}"`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(result).toContain('5 + 3 = 8');
      expect(result).toContain('4 × 7 = 28');
      expect(result).toContain('ТЕСТ');
    });

    test('should run file with nested module imports', () => {
      // Create base module
      const baseFile = path.join(tempDir, 'base.som');
      fs.writeFileSync(
        baseFile,
        `содир собит ПИ: рақам = 3.14159;

содир функсия квадрат(х: рақам): рақам {
    бозгашт х * х;
}`
      );

      // Create derived module that imports base
      const derivedFile = path.join(tempDir, 'derived.som');
      fs.writeFileSync(
        derivedFile,
        `ворид { ПИ, квадрат } аз "./base";

содир функсия масоҳати_доира(р: рақам): рақам {
    бозгашт ПИ * квадрат(р);
}`
      );

      // Create main file that imports derived
      const mainFile = path.join(tempDir, 'main.som');
      fs.writeFileSync(
        mainFile,
        `ворид { масоҳати_доира } аз "./derived";

тағйирёбанда масоҳат = масоҳати_доира(10);
чоп.сабт("Масоҳат: " + масоҳат);`
      );

      const result = execSync(`node "${cliPath}" run "${mainFile}"`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(result).toContain('Масоҳат:');
      expect(result).toMatch(/314\.159/); // Should calculate area correctly
    });

    test('should run file with default export import', () => {
      // Create module with default export
      const moduleFile = path.join(tempDir, 'module.som');
      fs.writeFileSync(
        moduleFile,
        `содир пешфарз функсия асосӣ(): сатр {
    бозгашт "Функсияи пешфарз";
}`
      );

      // Create main file that imports default
      const mainFile = path.join(tempDir, 'main.som');
      fs.writeFileSync(
        mainFile,
        `ворид асосӣ аз "./module";

чоп.сабт(асосӣ());`
      );

      const result = execSync(`node "${cliPath}" run "${mainFile}"`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(result).toContain('Функсияи пешфарз');
    });

    test('should run file with aliased imports', () => {
      // Create module
      const moduleFile = path.join(tempDir, 'module.som');
      fs.writeFileSync(
        moduleFile,
        `содир функсия функсия_бо_номи_дароз(х: рақам): рақам {
    бозгашт х * 2;
}`
      );

      // Create main file with aliased import
      const mainFile = path.join(tempDir, 'main.som');
      fs.writeFileSync(
        mainFile,
        `ворид { функсия_бо_номи_дароз чун дубаракуни } аз "./module";

чоп.сабт(дубаракуни(5));`
      );

      const result = execSync(`node "${cliPath}" run "${mainFile}"`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(result).toContain('10');
    });
  });

  describe('module imports with subdirectories', () => {
    test('should run file with imports from subdirectory', () => {
      // Create subdirectory
      const libDir = path.join(tempDir, 'lib');
      fs.mkdirSync(libDir);

      // Create module in subdirectory
      const moduleFile = path.join(libDir, 'utils.som');
      fs.writeFileSync(
        moduleFile,
        `содир функсия ҳисоб(х: рақам): рақам {
    бозгашт х + 10;
}`
      );

      // Create main file
      const mainFile = path.join(tempDir, 'main.som');
      fs.writeFileSync(
        mainFile,
        `ворид { ҳисоб } аз "./lib/utils";

чоп.сабт(ҳисоб(5));`
      );

      const result = execSync(`node "${cliPath}" run "${mainFile}"`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(result).toContain('15');
    });

    test('should run file with imports from parent directory', () => {
      // Create module in temp root
      const moduleFile = path.join(tempDir, 'shared.som');
      fs.writeFileSync(moduleFile, `содир собит РАҚАМ: рақам = 42;`);

      // Create subdirectory
      const subDir = path.join(tempDir, 'sub');
      fs.mkdirSync(subDir);

      // Create main file in subdirectory
      const mainFile = path.join(subDir, 'main.som');
      fs.writeFileSync(
        mainFile,
        `ворид { РАҚАМ } аз "../shared";

чоп.сабт("РАҚАМ: " + РАҚАМ);`
      );

      const result = execSync(`node "${cliPath}" run "${mainFile}"`, {
        encoding: 'utf-8',
        cwd: subDir,
      });

      expect(result).toContain('РАҚАМ: 42');
    });
  });

  describe('module imports with classes', () => {
    test('should run file with imported class', () => {
      // Create class module
      const classFile = path.join(tempDir, 'counter.som');
      fs.writeFileSync(
        classFile,
        `содир синф Ҳисобгар {
    хосусӣ шумора: рақам;

    конструктор() {
        ин.шумора = 0;
    }

    ҷамъиятӣ афзоиш(): холӣ {
        ин.шумора = ин.шумора + 1;
    }

    ҷамъиятӣ гирифтан(): рақам {
        бозгашт ин.шумора;
    }
}`
      );

      // Create main file that uses the class
      const mainFile = path.join(tempDir, 'main.som');
      fs.writeFileSync(
        mainFile,
        `ворид { Ҳисобгар } аз "./counter";

тағйирёбанда ҳисобгар = нав Ҳисобгар();
ҳисобгар.афзоиш();
ҳисобгар.афзоиш();
ҳисобгар.афзоиш();
чоп.сабт("Шумора: " + ҳисобгар.гирифтан());`
      );

      const result = execSync(`node "${cliPath}" run "${mainFile}"`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(result).toContain('Шумора: 3');
    });
  });

  describe('error handling with modules', () => {
    test('should handle missing module gracefully', () => {
      const mainFile = path.join(tempDir, 'main.som');
      fs.writeFileSync(
        mainFile,
        `ворид { функсия } аз "./nonexistent";

чоп.сабт("Test");`
      );

      expect(() => {
        execSync(`node "${cliPath}" run "${mainFile}"`, {
          stdio: 'pipe',
          cwd: tempDir,
        });
      }).toThrow();
    });

    test('should handle module with syntax errors', () => {
      // Create module with syntax error
      const moduleFile = path.join(tempDir, 'broken.som');
      fs.writeFileSync(moduleFile, 'invalid syntax here!!!');

      // Create main file that tries to import it
      const mainFile = path.join(tempDir, 'main.som');
      fs.writeFileSync(
        mainFile,
        `ворид { функсия } аз "./broken";

чоп.сабт("Test");`
      );

      expect(() => {
        execSync(`node "${cliPath}" run "${mainFile}"`, {
          stdio: 'pipe',
          cwd: tempDir,
        });
      }).toThrow();
    });

    test('should handle circular dependencies', () => {
      // Create module A that imports B
      const moduleA = path.join(tempDir, 'a.som');
      fs.writeFileSync(
        moduleA,
        `ворид { функсияБ } аз "./b";

содир функсия функсияА(): сатр {
    бозгашт "A calls " + функсияБ();
}`
      );

      // Create module B that imports A (circular)
      const moduleB = path.join(tempDir, 'b.som');
      fs.writeFileSync(
        moduleB,
        `ворид { функсияА } аз "./a";

содир функсия функсияБ(): сатр {
    бозгашт "B";
}`
      );

      // Create main file
      const mainFile = path.join(tempDir, 'main.som');
      fs.writeFileSync(
        mainFile,
        `ворид { функсияА } аз "./a";

чоп.сабт(функсияА());`
      );

      // Should detect and report circular dependency
      expect(() => {
        execSync(`node "${cliPath}" run "${mainFile}"`, {
          stdio: 'pipe',
          cwd: tempDir,
        });
      }).toThrow();
    });
  });

  describe('module imports with constants and variables', () => {
    test('should run file with imported constants', () => {
      // Create constants module
      const constantsFile = path.join(tempDir, 'constants.som');
      fs.writeFileSync(
        constantsFile,
        `содир собит МАКСИМУМ: рақам = 100;
содир собит МИНИМУМ: рақам = 0;
содир собит НОМ: сатр = "СомонСкрипт";`
      );

      // Create main file
      const mainFile = path.join(tempDir, 'main.som');
      fs.writeFileSync(
        mainFile,
        `ворид { МАКСИМУМ, МИНИМУМ, НОМ } аз "./constants";

чоп.сабт("Барнома: " + НОМ);
чоп.сабт("Диапазон: " + МИНИМУМ + " - " + МАКСИМУМ);`
      );

      const result = execSync(`node "${cliPath}" run "${mainFile}"`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      expect(result).toContain('СомонСкрипт');
      expect(result).toContain('0 - 100');
    });
  });

  describe('real-world example', () => {
    test('should run the 37-module-imports-demo example', () => {
      const examplePath = path.join(__dirname, '..', 'examples', '37-module-imports-demo');
      const mainFile = path.join(examplePath, 'main.som');

      // Check if the example exists
      if (!fs.existsSync(mainFile)) {
        console.warn('Skipping real-world example test - example not found');
        return;
      }

      const result = execSync(`node "${cliPath}" run "${mainFile}"`, {
        encoding: 'utf-8',
        cwd: examplePath,
      });

      // Verify key outputs from the example
      expect(result).toContain('Модули математикӣ');
      expect(result).toContain('Модули сатрӣ');
      expect(result).toContain('ПИ');
      expect(result).toContain('Модулҳо бомуваффақият ворид шуданд');
    });
  });

  describe('performance and cleanup', () => {
    test('should clean up temporary files after execution', () => {
      // Create a simple module
      const moduleFile = path.join(tempDir, 'module.som');
      fs.writeFileSync(
        moduleFile,
        `содир функсия тест(): сатр {
    бозгашт "test";
}`
      );

      // Create main file
      const mainFile = path.join(tempDir, 'main.som');
      fs.writeFileSync(
        mainFile,
        `ворид { тест } аз "./module";

чоп.сабт(тест());`
      );

      // Get list of files before running
      const filesBefore = fs.readdirSync(tempDir);

      // Run the command
      execSync(`node "${cliPath}" run "${mainFile}"`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      // Get list of files after running
      const filesAfter = fs.readdirSync(tempDir);

      // Should not have any extra temporary .js files left over
      const tempJsFiles = filesAfter.filter(f => f.includes('.somon-run-') && f.endsWith('.js'));
      expect(tempJsFiles.length).toBe(0);

      // Should only have the original .som files
      expect(filesAfter.length).toBe(filesBefore.length);
    });

    test('should execute bundled code quickly', () => {
      // Create a simple module
      const moduleFile = path.join(tempDir, 'fast.som');
      fs.writeFileSync(
        moduleFile,
        `содир функсия тез(): сатр {
    бозгашт "Fast execution";
}`
      );

      // Create main file
      const mainFile = path.join(tempDir, 'main.som');
      fs.writeFileSync(
        mainFile,
        `ворид { тез } аз "./fast";

чоп.сабт(тез());`
      );

      const startTime = Date.now();

      execSync(`node "${cliPath}" run "${mainFile}"`, {
        encoding: 'utf-8',
        cwd: tempDir,
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should execute in reasonable time (less than 5 seconds)
      expect(executionTime).toBeLessThan(5000);
    });
  });
});
