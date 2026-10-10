// Recursion
function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}
function fibonacci(n: number, memo: Map<number, number> = new Map()): number {
  if (n < 2) return n;
  const cached = memo.get(n);
  if (cached !== undefined) return cached;
  const value = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);
  memo.set(n, value);
  return value;
}
function flatten(values: unknown[]): unknown[] {
  return values.reduce<unknown[]>(
    (acc, v) => (Array.isArray(v) ? acc.concat(flatten(v)) : acc.concat([v])),
    []
  );
}

console.log(factorial(10), fibonacci(40));
console.log(flatten([1, [2, [3, [4]], 5]]));
