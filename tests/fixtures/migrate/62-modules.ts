// export declarations inside a single module
export const VERSION = '1.0';
export function double(n: number): number {
  return n * 2;
}
export class Greeter {
  greet(name: string): string {
    return `hello ${name}`;
  }
}
export default function main(): void {
  console.log(VERSION, double(21), new Greeter().greet('module'));
}
export type Id = number;
export interface Shape {
  sides: number;
}
const internal = 'internal';
export { internal as exportedInternal };

main();
console.log(Object.keys(module.exports).sort().join(','));
