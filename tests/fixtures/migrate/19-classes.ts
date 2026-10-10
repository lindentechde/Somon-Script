// Classes: fields, constructor, methods, accessors
class Point {
  x: number;
  y: number;
  static readonly origin = new Point(0, 0);

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  get length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  set scale(factor: number) {
    this.x *= factor;
    this.y *= factor;
  }

  add(other: Point): Point {
    return new Point(this.x + other.x, this.y + other.y);
  }

  toString(): string {
    return `(${this.x}, ${this.y})`;
  }
}

const p = new Point(3, 4);
console.log(p.length, p.add(new Point(1, 1)).toString(), String(Point.origin));
p.scale = 2;
console.log(p.toString(), p instanceof Point);
