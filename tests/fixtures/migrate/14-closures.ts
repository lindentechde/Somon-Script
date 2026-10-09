// Closures and higher-order functions
function makeCounter(start = 0) {
  let count = start;
  return {
    increment: () => ++count,
    decrement: () => --count,
    get current() {
      return count;
    },
  };
}

const counter = makeCounter(5);
counter.increment();
counter.increment();
counter.decrement();
console.log(counter.current);

const compose =
  <T>(...fns: Array<(x: T) => T>) =>
  (x: T): T =>
    fns.reduceRight((acc, fn) => fn(acc), x);
const inc = (x: number) => x + 1;
const double = (x: number) => x * 2;
console.log(compose(inc, double)(5), compose(double, inc)(5));

const adders = [1, 2, 3].map(n => (x: number) => x + n);
console.log(adders.map(f => f(10)));
