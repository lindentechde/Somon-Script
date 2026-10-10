// Type arguments in expressions, read as TypeScript reads them: a `<…>` is a
// type argument list when it parses as types and is followed by `(`, a
// template, a line break, a binary operator or a token that cannot start an
// expression; otherwise `<` and `>` compare.
function id<T>(value: T): T {
  return value;
}
function describe(value: unknown): string {
  return typeof value;
}

// Every kind of type as a type argument
console.log(id<any>(1), id<number>(2), id<string>('s'), id<boolean>(true), id<unknown>(3));
console.log(id<null>(null), id<undefined>(undefined), id<object>({}) !== null, id<void>(undefined));
console.log(describe(id<bigint>(1n)), describe(id<symbol>(Symbol('s'))), id<never[]>([]).length);
console.log(id<'a'>('a'), id<1>(1), id<true>(true), id<-1>(-1), id<`x${string}`>('xy'));
console.log(id<number | string>(4), id<number & {}>(5), id<number[]>([6]).length);
console.log(id<[number, string]>([7, 'eight'])[1], id<readonly number[]>([9])[0]);
console.log(id<{ a: number }>({ a: 10 }).a, id<{ a: number; b?: string }>({ a: 11 }).a);
console.log(id<(x: number) => number>(x => x + 1)(11), id<new () => object>(Object) === Object);
console.log(
  id<Map<string, Map<string, number>>>(new Map()).size,
  id<Array<Array<number>>>([[12]])[0][0]
);
const sample = { key: 'value', count: 13 };
console.log(id<keyof typeof sample>('key'), id<typeof sample>(sample).count);
console.log(id<(typeof sample)['key']>('k'), id<{ [K in 'a' | 'b']: K }>({ a: 'a', b: 'b' }).b);
console.log(id<string extends number ? 1 : 2>(2), id<Partial<typeof sample>>({}).count);

// Calls on members, results, elements, optional links and tagged templates
// prettier-ignore
const tools = { id, wrap: <T,>(value: T) => [value] };
console.log(tools.id<any>(14), tools.wrap<string>('w')[0], [1, 2].map<any>(n => n * 2).join());
const factory = () => id;
// prettier-ignore
console.log(factory()<number>(15), [id][0]<number>(16), (id)<number>(17));
const maybe: typeof id | undefined = id;
console.log(maybe?.<number>(18), tools?.id<string>('19'));
function tag<T>(strings: TemplateStringsArray, ...values: T[]): string {
  return strings.join('|') + values.join(',');
}
console.log(tag<number>`a${20}b`, tag<any>`c`);

// Instantiation expressions: type arguments without a call
const idNumber = id<number>;
const makeMap = Map<string, number>;
console.log(idNumber(21), new makeMap([['m', 22]]).get('m'));
const both = [id<string>, id<boolean>];
// prettier-ignore
console.log(both.length, typeof (id<number>), id<number> === id);

// Comparisons that merely look like type arguments
// prettier-ignore
const a = 1, b = 2, c = 3;
console.log(a < b, b > c, a < b > c, a < b > +1, a < b > -1);
// prettier-ignore
console.log(a < b >= c, (a < b) > (c > a) === false, a < b == true);
let calls = 0;
function count(): number {
  return ++calls;
}
// prettier-ignore
console.log(a < b && b > count(), calls, a <b> c);

// TypeScript reads these as calls with type arguments, not as comparisons
const f = (x: number) => x * 100;
const g = f;
// prettier-ignore
console.log(f(g < number, string > (5)));
try {
  // prettier-ignore
  console.log((a as any) < (b as any) > (c));
} catch (error) {
  console.log('not callable');
}

// Generic `new` with keyword type arguments
class Box<T> {
  constructor(public value: T) {}
}
console.log(new Box<any>(23).value, new Box<unknown>(24).value, new Box<number>(25).value);
