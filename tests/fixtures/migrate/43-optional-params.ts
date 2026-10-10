// Optional parameters and properties
function format(value: number, unit?: string, precision: number = 1): string {
  return value.toFixed(precision) + (unit ? ` ${unit}` : '');
}
console.log(format(3), format(3, 'kg'), format(3.14159, 'm', 3));

interface Options {
  verbose?: boolean;
  level?: number;
}
function run(options: Options = {}): string {
  const { verbose = false, level = 1 } = options;
  return `${verbose}:${level}`;
}
console.log(run(), run({ verbose: true }), run({ level: 3 }));

class Box {
  label?: string;
  size!: number;
  constructor(size?: number) {
    if (size !== undefined) this.size = size;
  }
}
const box = new Box(2);
console.log(box.label === undefined, box.size, new Box().size);
