// Optional chaining
interface Node {
  value: number;
  next?: Node;
  describe?(): string;
}

const list: Node = { value: 1, next: { value: 2, describe: () => 'two' } };
console.log(list.next?.value, list.next?.next?.value, list.describe?.());
console.log(list.next?.describe?.());

const items: number[] | undefined = undefined;
console.log(items?.[0], items?.length ?? 'none');

const fns: Record<string, (() => string) | undefined> = { hi: () => 'hi' };
console.log(fns.hi?.(), fns.bye?.());
