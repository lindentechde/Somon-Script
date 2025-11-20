import { compile } from '../src/compiler';

describe('Arrow Function Parsing Reproduction', () => {
  test('should correctly parse arrow function as method argument', () => {
    const source = `
тағ рақамҳо = [1, 2, 3];
рақамҳо.бароиҲар((рақам, индекс) => {
  чоп.сабт(рақам);
});
`;
    const result = compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('.forEach((');
    expect(result.code).toContain('=>');
  });
});
