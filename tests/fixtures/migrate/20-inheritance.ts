// Inheritance and super
class Animal {
  constructor(protected name: string) {}
  speak(): string {
    return `${this.name} makes a sound`;
  }
  get kind(): string {
    return 'animal';
  }
}

class Dog extends Animal {
  constructor(
    name: string,
    private breed: string
  ) {
    super(name);
  }
  speak(): string {
    return `${super.speak()} (woof, ${this.breed})`;
  }
  get kind(): string {
    return 'dog/' + super.kind;
  }
}

class Puppy extends Dog {
  speak(): string {
    return super.speak().replace('sound', 'tiny sound');
  }
}

const animals: Animal[] = [new Animal('Cat'), new Dog('Rex', 'lab'), new Puppy('Bit', 'pug')];
for (const a of animals) console.log(a.speak(), a.kind);
console.log(new Puppy('x', 'y') instanceof Animal, Object.getPrototypeOf(Puppy) === Dog);
