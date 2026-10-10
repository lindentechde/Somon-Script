// Promise chains: then, catch, finally, race
function wait<T>(value: T, fail = false): Promise<T> {
  return new Promise((resolve, reject) => {
    if (fail) reject(new Error(`failed ${value}`));
    else resolve(value);
  });
}

wait(1)
  .then(v => v + 1)
  .then(v => {
    console.log('then', v);
    return wait(v, true);
  })
  .catch((e: Error) => console.log('catch', e.message))
  .finally(() => console.log('finally'));

Promise.race([wait('fast'), new Promise<string>(() => {})]).then(v => console.log('race', v));
Promise.any([wait('x', true), wait('y')]).then(v => console.log('any', v));
const p = Promise.reject(new Error('rejected'));
p.catch(e => console.log('handled', e.message));
