import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

import { compile, CompileResult } from '../compiler';
import { loadConfig } from '../config';
import pkg from '../../package.json';

export interface CompileOptions {
  output?: string;
  target?: string;
  sourceMap?: boolean;
  minify?: boolean;
  noTypeCheck?: boolean;
  strict?: boolean;
  outDir?: string;
  watch?: boolean;
  compileOnSave?: boolean;
}

function mergeOptions(input: string, options: CompileOptions): CompileOptions {
  const config = loadConfig(path.dirname(path.resolve(input)));
  const merged = { ...(config.compilerOptions ?? {}), ...options };
  if (!merged.target) {
    merged.target = 'es2020';
  }
  return merged;
}

export function compileFile(input: string, options: CompileOptions): CompileResult {
  try {
    if (!fs.existsSync(input)) {
      const message = `Error: File '${input}' not found`;
      console.error(message);
      process.exitCode = 1;
      return { code: '', errors: [message], warnings: [] };
    }

    const source = fs.readFileSync(input, 'utf-8');
    const result = compile(source, {
      target: options.target as 'es5' | 'es2015' | 'es2020' | 'esnext' | undefined,
      sourceMap: options.sourceMap,
      minify: options.minify,
      typeCheck: !options.noTypeCheck,
      strict: options.strict,
    });

    if (result.errors.length > 0) {
      console.error('Compilation errors:');
      result.errors.forEach(error => console.error(`  ${error}`));
      process.exitCode = 1;
    }

    if (result.warnings.length > 0) {
      console.warn('Warnings:');
      result.warnings.forEach(warning => console.warn(`  ${warning}`));
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error:', message);
    process.exitCode = 1;
    return { code: '', errors: [message], warnings: [] };
  }
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name('somon')
    .description('SomonScript compiler - Compile Tajik Cyrillic code to JavaScript')
    .version(pkg.version);

  program
    .command('compile')
    .alias('c')
    .description('Compile SomonScript files to JavaScript')
    .argument('<input>', 'Input .som file')
    .option('-o, --output <file>', 'Output file (default: same name with .js extension)')
    .option('--out-dir <dir>', 'Output directory')
    .option('--target <target>', 'Compilation target')
    .option('--source-map', 'Generate source maps')
    .option('--minify', 'Minify output')
    .option('--no-type-check', 'Disable type checking')
    .option('--strict', 'Enable strict type checking')
    .option('-w, --watch', 'Recompile on file changes')
    .action((input: string, options: CompileOptions): void => {
      try {
        const merged = mergeOptions(input, options);
        const compileOnce = (): void => {
          const result = compileFile(input, merged);
          if (result.errors.length > 0) return;

          const baseDir = path.dirname(path.resolve(input));
          const outputFile =
            merged.output ||
            (merged.outDir
              ? path.join(
                  path.resolve(baseDir, merged.outDir),
                  path.basename(input).replace(/\.som$/, '.js')
                )
              : input.replace(/\.som$/, '.js'));
          fs.mkdirSync(path.dirname(outputFile), { recursive: true });
          fs.writeFileSync(outputFile, result.code);
          console.log(`Compiled '${input}' to '${outputFile}'`);

          if (merged.sourceMap && result.sourceMap) {
            const sourceMapFile = `${outputFile}.map`;
            fs.writeFileSync(sourceMapFile, result.sourceMap);
            console.log(`Generated source map: '${sourceMapFile}'`);
          }
        };

        compileOnce();

        if (merged.watch || merged.compileOnSave) {
          console.log(`Watching '${input}' for changes...`);
          fs.watch(input, { persistent: false }, () => {
            console.log(`Recompiling '${input}'...`);
            compileOnce();
          });
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exitCode = 1;
        return;
      }
    });

  program
    .command('run')
    .alias('r')
    .description('Compile and run SomonScript file')
    .argument('<input>', 'Input .som file')
    .option('--target <target>', 'Compilation target')
    .option('--source-map', 'Generate source maps')
    .option('--minify', 'Minify output')
    .option('--no-type-check', 'Disable type checking')
    .option('--strict', 'Enable strict type checking')
    .action((input: string, options: CompileOptions): void => {
      try {
        const merged = mergeOptions(input, options);
        const result = compileFile(input, merged);
        if (result.errors.length > 0) return;

        // eslint-disable-next-line no-eval
        eval(result.code);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exitCode = 1;
        return;
      }
    });

  program
    .command('init')
    .description('Initialize a new SomonScript project')
    .argument('[name]', 'Project name', 'somon-project')
    .action((name: string): void => {
      try {
        const projectDir = path.resolve(name);

        if (fs.existsSync(projectDir)) {
          console.error(`Error: Directory '${name}' already exists`);
          process.exitCode = 1;
          return;
        }

        // Create project directory
        fs.mkdirSync(projectDir, { recursive: true });

        // Create package.json
        const packageJson = {
          name,
          version: '1.0.0',
          description: 'A SomonScript project',
          main: 'dist/main.js',
          scripts: {
            build: 'somon compile src/main.som -o dist/main.js',
            dev: 'somon run src/main.som',
          },
          devDependencies: {
            'somon-script': '^0.2.0',
          },
        };

        fs.writeFileSync(
          path.join(projectDir, 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        // Create src and dist directories
        fs.mkdirSync(path.join(projectDir, 'src'));
        fs.mkdirSync(path.join(projectDir, 'dist'));

        // Create default configuration
        const somonConfig = {
          compilerOptions: {
            target: 'es2020',
            sourceMap: false,
            minify: false,
            noTypeCheck: false,
            strict: false,
            outDir: 'dist',
            compileOnSave: false,
          },
        };

        fs.writeFileSync(
          path.join(projectDir, 'somon.config.json'),
          JSON.stringify(somonConfig, null, 2)
        );

        // Create main file
        const mainSom = `// SomonScript main file
функсия салом(): void {
    чоп.сабт("Салом, ҷаҳон!");
}

салом();
`;

        fs.writeFileSync(path.join(projectDir, 'src', 'main.som'), mainSom);

        console.log(`✅ Created SomonScript project '${name}'`);
        console.log(`\nNext steps:`);
        console.log(`  cd ${name}`);
        console.log(`  npm install`);
        console.log(`  npm run dev`);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  return program;
}
