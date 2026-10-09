// Numeric, string and const enums
enum Color {
  Red,
  Green = 5,
  Blue,
}
enum Status {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
}
const enum Flag {
  None = 0,
  A = 1 << 0,
  B = 1 << 1,
}

console.log(Color.Red, Color.Green, Color.Blue, Color[6]);
console.log(Status.Active, Object.values(Status).join('|'));
const flags = Flag.A | Flag.B;
console.log(flags, (flags & Flag.B) !== 0, Flag.None);

function label(s: Status): string {
  switch (s) {
    case Status.Active:
      return 'on';
    case Status.Inactive:
      return 'off';
  }
}
console.log(label(Status.Inactive));
