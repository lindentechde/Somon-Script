// Abstract classes and members
abstract class Shape {
  abstract area(): number;
  protected abstract readonly label: string;
  describe(): string {
    return `${this.label}: ${this.area().toFixed(2)}`;
  }
}

class Circle extends Shape {
  protected readonly label = 'circle';
  constructor(private radius: number) {
    super();
  }
  area(): number {
    return Math.PI * this.radius ** 2;
  }
}

class Rect extends Shape {
  protected readonly label = 'rect';
  constructor(
    private w: number,
    private h: number
  ) {
    super();
  }
  area(): number {
    return this.w * this.h;
  }
}

const shapes: Shape[] = [new Circle(1), new Rect(2, 3)];
shapes.forEach(s => console.log(s.describe()));
console.log(shapes.map(s => s.area()).reduce((a, b) => a + b, 0) > 9);
