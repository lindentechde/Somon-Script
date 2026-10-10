// Static members and static blocks
class Registry {
  static count = 0;
  static readonly names: string[] = [];
  static {
    Registry.names.push('init');
  }

  static register(name: string): number {
    Registry.names.push(name);
    return ++Registry.count;
  }

  static get size(): number {
    return Registry.names.length;
  }
}

Registry.register('a');
Registry.register('b');
console.log(Registry.count, Registry.size, Registry.names.join(','));

class Temperature {
  private static readonly ratio = 9 / 5;
  static toFahrenheit(c: number): number {
    return c * Temperature.ratio + 32;
  }
}
console.log(Temperature.toFahrenheit(100), Temperature.toFahrenheit(-40));
