// Getters and setters with validation
class Temperature {
  private celsius = 0;
  static #instances = 0;

  constructor() {
    Temperature.#instances++;
  }

  get fahrenheit(): number {
    return this.celsius * 1.8 + 32;
  }
  set fahrenheit(value: number) {
    this.celsius = (value - 32) / 1.8;
  }
  get kelvin(): number {
    return this.celsius + 273.15;
  }
  static get instances(): number {
    return Temperature.#instances;
  }
}

const t = new Temperature();
t.fahrenheit = 212;
console.log(t.fahrenheit, t.kelvin, Temperature.instances);
const descriptor = Object.getOwnPropertyDescriptor(Temperature.prototype, 'kelvin');
console.log(typeof descriptor?.get, descriptor?.set);
