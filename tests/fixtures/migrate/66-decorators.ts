// Standard (TypeScript 5) decorators on classes, methods, fields and accessors
const log: string[] = [];

function logged<This, Args extends unknown[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>
) {
  const name = String(context.name);
  return function (this: This, ...args: Args): Return {
    log.push(`call ${name}(${args.join(', ')})`);
    return target.call(this, ...args);
  };
}

function doubled(_value: undefined, context: ClassFieldDecoratorContext) {
  log.push(`field ${String(context.name)}`);
  return (initial: number) => initial * 2;
}

function tracked<This, Value>(
  target: ClassAccessorDecoratorTarget<This, Value>,
  context: ClassAccessorDecoratorContext<This, Value>
): ClassAccessorDecoratorResult<This, Value> {
  return {
    get(this: This): Value {
      log.push(`get ${String(context.name)}`);
      return target.get.call(this);
    },
    set(this: This, value: Value): void {
      log.push(`set ${String(context.name)}`);
      target.set.call(this, value);
    },
  };
}

function registered(prefix: string) {
  return function <T extends new (...args: any[]) => object>(
    target: T,
    context: ClassDecoratorContext<T>
  ): T {
    log.push(`${prefix} ${String(context.name)}`);
    context.addInitializer(function () {
      log.push('initialized');
    });
    return target;
  };
}

@registered('class')
class Counter {
  @doubled count = 5;
  @tracked accessor label = 'counter';

  @logged
  add(amount: number): number {
    this.count += amount;
    return this.count;
  }

  @logged
  static create(): Counter {
    return new Counter();
  }

  get double(): number {
    return this.count * 2;
  }
}

const counter = Counter.create();
console.log(counter.add(3), counter.count, counter.double);
counter.label = 'renamed';
console.log(counter.label);
console.log(log.join('\n'));
