// Logical assignment and nullish coalescing
let a: number | null = null;
a ??= 10;
let b = 0;
b ||= 20;
let c = 1;
c &&= 30;
console.log(a, b, c);

const settings: { retries?: number; name?: string } = {};
settings.retries ??= 3;
settings.name ||= 'default';
console.log(settings.retries, settings.name);
