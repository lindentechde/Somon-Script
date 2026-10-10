// Type aliases, unions, intersections and literal types
type Direction = 'up' | 'down' | 'left' | 'right';
type Point = { x: number; y: number };
type Labeled = { label: string };
type LabeledPoint = Point & Labeled;
type Result = { ok: true; value: number } | { ok: false; error: string };

function move(p: Point, d: Direction): Point {
  switch (d) {
    case 'up':
      return { ...p, y: p.y + 1 };
    case 'down':
      return { ...p, y: p.y - 1 };
    case 'left':
      return { ...p, x: p.x - 1 };
    case 'right':
      return { ...p, x: p.x + 1 };
  }
}

function describe(r: Result): string {
  return r.ok ? `value ${r.value}` : `error ${r.error}`;
}

const lp: LabeledPoint = { x: 0, y: 0, label: 'start' };
console.log(move(move(lp, 'up'), 'right'), lp.label);
console.log(describe({ ok: true, value: 5 }), describe({ ok: false, error: 'bad' }));
