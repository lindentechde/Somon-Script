// Call and construct signatures in interfaces and object types
interface Formatter {
  (value: number): string;
  prefix: string;
}
interface Point {
  x: number;
}
interface PointConstructor {
  new (x: number): Point;
  readonly kind: string;
}
type Adder = { (a: number, b: number): number };
type Identity = { <T>(value: T): T };

function makeFormatter(prefix: string): Formatter {
  const format = (value: number) => `${prefix}${value}`;
  return Object.assign(format, { prefix });
}
class PointImpl implements Point {
  static kind = 'point';
  constructor(public x: number) {}
}
function build(ctor: PointConstructor, x: number): Point {
  return new ctor(x);
}

const format = makeFormatter('#');
const add: Adder = (a, b) => a + b;
const identity: Identity = value => value;
console.log(format(5), format.prefix, add(2, 3), identity('same'), identity<number>(7));
console.log(build(PointImpl, 4).x, PointImpl.kind);
