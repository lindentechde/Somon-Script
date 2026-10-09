/**
 * Source maps must point generated JavaScript back to the right SomonScript
 * line, through every pipeline path (plain, TypeScript down-levelling, minify).
 */

import { SourceMapConsumer, type RawSourceMap } from 'source-map';
import { compile, type CompileOptions } from '../src/compiler';

const source = [
  '// сатри якум',
  '// сатри дуюм',
  '// сатри сеюм',
  'функсия ф(а) {',
  '  бозгашт а + 1;',
  '}',
  '',
  'чоп.сабт(ф(41));',
].join('\n');

/** Original position of the first generated occurrence of `needle`. */
async function originalOf(code: string, map: RawSourceMap, needle: string) {
  const lines = code.split('\n');
  const line = lines.findIndex(text => text.includes(needle));
  expect(line).toBeGreaterThanOrEqual(0);
  const column = lines[line].indexOf(needle);
  return SourceMapConsumer.with(map, null, consumer =>
    consumer.originalPositionFor({
      line: line + 1,
      column,
      bias: SourceMapConsumer.LEAST_UPPER_BOUND,
    })
  );
}

function compileWithMap(options: CompileOptions) {
  const result = compile(source, { sourceMap: true, typeCheck: false, ...options });
  expect(result.errors).toEqual([]);
  expect(result.sourceMap).toBeDefined();
  return { code: result.code, map: JSON.parse(result.sourceMap!) as RawSourceMap };
}

describe('source maps', () => {
  test.each<CompileOptions['target']>(['es2020', 'esnext', 'es2015', 'es5'])(
    'target %s maps statements to their SomonScript lines',
    async target => {
      const { code, map } = compileWithMap({ target });
      expect(map.sources).toEqual(['source.som']);
      expect(map.sourcesContent).toEqual([source]);
      expect(code).not.toContain('sourceMappingURL');

      const fn = await originalOf(code, map, 'function');
      expect(fn).toMatchObject({ source: 'source.som', line: 4 });
      const ret = await originalOf(code, map, 'return');
      expect(ret).toMatchObject({ source: 'source.som', line: 5 });
      const log = await originalOf(code, map, 'console.log');
      expect(log).toMatchObject({ source: 'source.som', line: 8 });
    }
  );

  test('minified output maps to the SomonScript source', async () => {
    const { code, map } = compileWithMap({ minify: true, sourceFileName: 'src/барнома.som' });
    expect(map.sources).toEqual(['src/барнома.som']);
    expect(map.sourcesContent).toEqual([source]);
    const log = await originalOf(code, map, 'console.log');
    // The consumer URL-encodes non-ASCII source names
    expect(decodeURIComponent(log.source ?? '')).toBe('src/барнома.som');
    expect(log.line).toBe(8);
  });

  test('no source map unless requested', () => {
    expect(compile(source, { typeCheck: false }).sourceMap).toBeUndefined();
  });
});
