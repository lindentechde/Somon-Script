// Generic functions, classes and constraints
function first<T>(items: T[]): T | undefined {
  return items[0];
}
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

class Stack<T = number> {
  private items: T[] = [];
  push(item: T): this {
    this.items.push(item);
    return this;
  }
  pop(): T | undefined {
    return this.items.pop();
  }
  get size(): number {
    return this.items.length;
  }
}

console.log(first([3, 2, 1]), first<string>([]), longest('abc', 'de'), longest([1, 2], [1]));
console.log(pluck({ a: 1, b: 'two' }, 'b'));
const stack = new Stack<string>().push('a').push('b');
console.log(stack.pop(), stack.size, new Stack().push(1).size);
