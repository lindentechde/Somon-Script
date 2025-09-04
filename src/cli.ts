#!/usr/bin/env node

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

import { compile } from './compiler';

const program = new Command();

interface CompileOptions {
  output?: string;
  target?: string;
  sourceMap?: boolean;
  minify?: boolean;
  noTypeCheck?: boolean;
  strict?: boolean;
}

program
  .name('somoni')
  .description('Somoni-script compiler - Compile Tajik Cyrillic code to JavaScript')
  .version('0.2.0');

program
  .command('compile')
  .alias('c')
  .description('Compile Somoni-script files to JavaScript')
  .argument('<input>', 'Input .som file')
  .option('-o, --output <file>', 'Output file (default: same name with .js extension)')
  .option('--target <target>', 'Compilation target', 'es2020')
  .option('--source-map', 'Generate source maps')
  .option('--minify', 'Minify output')
  .option('--no-type-check', 'Disable type checking')
  .option('--strict', 'Enable strict type checking')
  .action((input: string, options: CompileOptions): void => {
    try {
      // Read input file
      if (!fs.existsSync(input)) {
        console.error(`Error: File '${input}' not found`);
        process.exit(1);
      }

      const source = fs.readFileSync(input, 'utf-8');

      // Compile
      const result = compile(source, {
        target: options.target as 'es5' | 'es2015' | 'es2020' | 'esnext' | undefined,
        sourceMap: options.sourceMap,
        minify: options.minify,
        typeCheck: !options.noTypeCheck,
        strict: options.strict,
      });

      // Handle errors
      if (result.errors.length > 0) {
        console.error('Compilation errors:');
        result.errors.forEach(error => console.error(`  ${error}`));
        process.exit(1);
      }

      // Handle warnings
      if (result.warnings.length > 0) {
        console.warn('Warnings:');
        result.warnings.forEach(warning => console.warn(`  ${warning}`));
      }

      // Determine output file
      const outputFile = options.output || input.replace(/\.som$/, '.js');

      // Write output
      fs.writeFileSync(outputFile, result.code);
      console.log(`Compiled '${input}' to '${outputFile}'`);

      // Write source map if requested
      if (options.sourceMap && result.sourceMap) {
        const sourceMapFile = `${outputFile}.map`;
        fs.writeFileSync(sourceMapFile, result.sourceMap);
        console.log(`Generated source map: '${sourceMapFile}'`);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('run')
  .alias('r')
  .description('Compile and run Somoni-script file')
  .argument('<input>', 'Input .som file')
  .action((input: string): void => {
    try {
      if (!fs.existsSync(input)) {
        console.error(`Error: File '${input}' not found`);
        process.exit(1);
      }

      const source = fs.readFileSync(input, 'utf-8');
      const result = compile(source);

      if (result.errors.length > 0) {
        console.error('Compilation errors:');
        result.errors.forEach(error => console.error(`  ${error}`));
        process.exit(1);
      }

      // Execute the compiled JavaScript
      // eslint-disable-next-line no-eval
      eval(result.code);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new Somoni-script project')
  .argument('[name]', 'Project name', 'somoni-project')
  .action((name: string): void => {
    try {
      const projectDir = path.resolve(name);

      if (fs.existsSync(projectDir)) {
        console.error(`Error: Directory '${name}' already exists`);
        process.exit(1);
      }

      // Create project directory
      fs.mkdirSync(projectDir, { recursive: true });

      // Create package.json
      const packageJson = {
        name,
        version: '1.0.0',
        description: 'A Somoni-script project',
        main: 'dist/main.js',
        scripts: {
          build: 'somoni compile src/main.som -o dist/main.js',
          dev: 'somoni run src/main.som',
        },
        devDependencies: {
          'somoni-script': '^0.2.0',
        },
      };

      fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      // Create src directory and main file
      fs.mkdirSync(path.join(projectDir, 'src'));
      fs.mkdirSync(path.join(projectDir, 'dist'));

      const mainSom = `// Somoni-script main file
функсия салом(): void {
    чоп.сабт("Салом, ҷаҳон!");
}

салом();
`;

      fs.writeFileSync(path.join(projectDir, 'src', 'main.som'), mainSom);

      console.log(`✅ Created Somoni-script project '${name}'`);
      console.log(`\nNext steps:`);
      console.log(`  cd ${name}`);
      console.log(`  npm install`);
      console.log(`  npm run dev`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
