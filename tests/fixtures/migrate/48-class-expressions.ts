// Class expressions and new.target
const Named = class Person {
  constructor(public name: string) {}
  hello(): string {
    return `I am ${this.name}`;
  }
};
console.log(new Named('Ali').hello(), Named.name);

const Anonymous = class {
  value = 3;
};
console.log(new Anonymous().value);

function Tracker(this: unknown) {
  return new.target === undefined ? 'called' : 'constructed';
}
console.log((Tracker as unknown as () => string)());

class Base {
  readonly created: string;
  constructor() {
    this.created = new.target.name;
  }
}
class Derived extends Base {}
console.log(new Base().created, new Derived().created);

function mixin<T extends new (...args: any[]) => object>(Superclass: T) {
  return class extends Superclass {
    mixed = true;
  };
}
const Mixed = mixin(Base);
console.log(new Mixed().mixed, new Mixed().created);
