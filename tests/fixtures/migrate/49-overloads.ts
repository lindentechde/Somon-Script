// Overload signatures (left out: they only carry types)
function describe(value: string): string;
function describe(value: number): string;
function describe(value: boolean): string;
function describe(value: string | number | boolean): string {
  return `${typeof value}:${String(value)}`;
}
console.log(describe('a'), describe(1), describe(true));

class Converter {
  convert(value: string): number;
  convert(value: number): string;
  convert(value: string | number): string | number {
    return typeof value === 'string' ? value.length : String(value);
  }
}
const c = new Converter();
console.log(c.convert('abc'), c.convert(42));
