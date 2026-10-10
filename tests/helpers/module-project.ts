import * as fs from 'fs';
import * as path from 'path';

import { canonicalTmpDir } from './paths';

/** A throw-away directory holding the files of a multi-module test project. */
export interface TempProject {
  /** Canonical absolute path of the project directory. */
  root: string;
  /** Absolute path of a file of the project, given with '/' separators. */
  file(relativePath: string): string;
  /** Write files (relative paths with '/' separators), creating their directories. */
  write(files: Record<string, string>): void;
  remove(): void;
}

export function createTempProject(prefix: string): TempProject {
  const root = canonicalTmpDir(prefix);
  const file = (relativePath: string): string => path.join(root, ...relativePath.split('/'));
  return {
    root,
    file,
    write(files) {
      for (const [relativePath, content] of Object.entries(files)) {
        const target = file(relativePath);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
      }
    },
    remove() {
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

/** A path with '/' separators, for assertions that hold on every OS. */
export function slash(filePath: string): string {
  return filePath.split(path.sep).join('/');
}
