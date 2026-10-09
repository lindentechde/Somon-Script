// Namespaces
namespace Geometry {
  export const unit = 1;
  export function area(w: number, h: number): number {
    return w * h * unit;
  }
  export namespace Circle {
    export function area(r: number): number {
      return Math.round(Math.PI * r * r);
    }
  }
}

console.log(Geometry.area(2, 3), Geometry.Circle.area(2), Geometry.unit);
