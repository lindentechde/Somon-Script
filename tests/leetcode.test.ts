import { compile } from '../src/compiler';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

// Every solution in examples/leetcode carries its own test cases: it prints a
// "✓"/"✗" line per case, throws when one fails and ends with SUCCESS_LINE.
const SUCCESS_LINE = 'Ҳамаи санҷишҳо гузаштанд';

describe('LeetCode solutions (examples/leetcode)', () => {
  const leetcodeDir = path.join(__dirname, '..', 'examples', 'leetcode');
  const solutions = fs
    .readdirSync(leetcodeDir)
    .filter(file => file.endsWith('.som'))
    .sort();

  test('the collection holds 100 problems', () => {
    expect(solutions).toHaveLength(100);
  });

  test.each(solutions)('%s compiles in strict mode and passes its test cases', file => {
    const source = fs.readFileSync(path.join(leetcodeDir, file), 'utf-8');
    const result = compile(source, { typeCheck: true, strict: true });
    expect(result.errors).toEqual([]);

    const lines: string[] = [];
    const log = (...args: unknown[]): void => {
      lines.push(args.map(String).join(' '));
    };
    vm.runInNewContext(result.code, { console: { log, error: log, warn: log, info: log } });

    expect(lines.filter(line => line.startsWith('✗'))).toEqual([]);
    expect(lines[lines.length - 1]).toBe(SUCCESS_LINE);
  });
});
