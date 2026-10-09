// LeetCode 146. LRU Cache: a Map keeps insertion order.
class LRUCache {
  private readonly entries = new Map<number, number>();
  constructor(private readonly capacity: number) {}

  get(key: number): number {
    if (!this.entries.has(key)) return -1;
    const value = this.entries.get(key)!;
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }

  put(key: number, value: number): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    if (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next().value as number;
      this.entries.delete(oldest);
    }
  }
}

let failures = 0;
function check(name: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log('✓ ' + name);
  } else {
    console.log(`✗ ${name}: expected ${e}, got ${a}`);
    failures++;
  }
}

const cache = new LRUCache(2);
cache.put(1, 1);
cache.put(2, 2);
check('get 1', cache.get(1), 1);
cache.put(3, 3);
check('evicted 2', cache.get(2), -1);
cache.put(4, 4);
check('evicted 1', cache.get(1), -1);
check('get 3', cache.get(3), 3);
check('get 4', cache.get(4), 4);
console.log(failures === 0 ? 'all passed' : `${failures} failed`);
