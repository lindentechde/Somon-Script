// Type assertions, as const, satisfies and non-null
const input: unknown = 'hello';
const len1 = (input as string).length;
const len2 = (<string>input).length;
console.log(len1, len2);

const directions = ['north', 'south'] as const;
type Dir = (typeof directions)[number];
const d: Dir = directions[1];
console.log(d, directions.length);

type Colors = Record<string, [number, number, number] | string>;
const palette = { red: [255, 0, 0], green: '#0f0' } satisfies Colors;
console.log(palette.red[0], palette.green.toUpperCase());

const map = new Map<string, number>([['a', 1]]);
const value = map.get('a')!;
console.log(value + 1);

let late!: number;
late = 5;
console.log(late);
const element = [1, 2, 3].find(n => n > 1)!;
console.log(element);
