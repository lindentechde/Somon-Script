// for await and async generators
async function* countdown(from: number): AsyncGenerator<number> {
  for (let i = from; i > 0; i--) {
    yield await Promise.resolve(i);
  }
}

async function main() {
  const seen: number[] = [];
  for await (const n of countdown(3)) {
    seen.push(n);
  }
  console.log(seen);
  for await (const v of [Promise.resolve('a'), 'b']) {
    console.log(v);
  }
}
main();
