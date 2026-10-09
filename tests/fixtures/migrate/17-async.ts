// async / await and promises
const delay = (value: number): Promise<number> => Promise.resolve(value);

async function total(): Promise<number> {
  const a = await delay(1);
  const b = await delay(2);
  const [c, d] = await Promise.all([delay(3), delay(4)]);
  return a + b + c + d;
}

async function failing(): Promise<string> {
  throw new Error('boom');
}

async function main(): Promise<void> {
  console.log('total', await total());
  try {
    await failing();
  } catch (e) {
    console.log('caught', (e as Error).message);
  }
  const results = await Promise.allSettled([delay(1), failing()]);
  console.log(results.map(r => r.status).join(','));
  const doubled = await Promise.all([1, 2, 3].map(async n => (await delay(n)) * 2));
  console.log(doubled);
}

main().then(() => console.log('done'));
console.log('sync first');
