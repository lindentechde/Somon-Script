// TypeScript 5 type syntax: const type parameters, variance, type-only imports
// and exports, declare global and ambient modules
import type { Stats } from 'fs';
import { type Dirent, constants } from 'fs';

declare global {
  interface Array<T> {
    lastItem?: T;
  }
}

declare module 'virtual-module' {
  export const value: number;
}

function first<const T extends readonly unknown[]>(items: T): T[0] {
  return items[0];
}

interface Producer<out T> {
  produce(): T;
}
interface Consumer<in T> {
  consume(value: T): void;
}

class Box<in out T> {
  constructor(public value: T) {}
}

const producer: Producer<string> = { produce: () => 'made' };
const consumer: Consumer<string> = { consume: value => console.log('consumed', value) };
consumer.consume(producer.produce());
console.log(first(['x', 'y'] as const), new Box(3).value, typeof constants.F_OK);

let stats: Stats | Dirent | undefined;
console.log(stats === undefined);

export type { Producer, Consumer };
export type Pair<T> = [T, T];
const pair: Pair<number> = [1, 2];
console.log(pair);
