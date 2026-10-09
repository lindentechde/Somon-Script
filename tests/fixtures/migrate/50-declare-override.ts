// declare, override and this parameters (no runtime meaning)
declare const BUILD_ID: string | undefined;
declare function externalHelper(x: number): number;

class Base {
  greet(): string {
    return 'base';
  }
  declare tag: string;
}

class Child extends Base {
  override greet(): string {
    return 'child of ' + super.greet();
  }
}

function describe(this: { name: string }, suffix: string): string {
  return this.name + suffix;
}

console.log(new Child().greet(), 'tag' in new Base());
console.log(
  describe.call({ name: 'ctx' }, '!'),
  typeof BUILD_ID === 'undefined' ? 'no build' : 'build'
);
