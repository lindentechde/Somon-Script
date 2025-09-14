import * as fs from 'fs';
import * as path from 'path';

export interface CompilerOptions {
  target?: 'es5' | 'es2015' | 'es2020' | 'esnext';
  sourceMap?: boolean;
  minify?: boolean;
  noTypeCheck?: boolean;
  strict?: boolean;
  outDir?: string;
  compileOnSave?: boolean;
}

export interface SomonConfig {
  compilerOptions?: CompilerOptions;
}

export function loadConfig(startPath: string): SomonConfig {
  let dir = path.resolve(startPath);
  let parent = '';
  while (dir !== parent) {
    const configPath = path.join(dir, 'somon.config.json');
    if (fs.existsSync(configPath)) {
      try {
        const json = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(json) as SomonConfig;
      } catch {
        return {};
      }
    }
    parent = dir;
    dir = path.dirname(dir);
  }
  return {};
}
