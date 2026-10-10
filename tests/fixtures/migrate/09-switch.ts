// switch with fallthrough and default
function dayType(day: string): string {
  switch (day) {
    case 'Sat':
    case 'Sun':
      return 'weekend';
    case 'Mon':
      return 'start';
    default:
      return 'weekday';
  }
}

console.log(['Sat', 'Mon', 'Wed', 'Sun'].map(dayType).join(' '));

function grade(score: number): string {
  let result = '';
  switch (true) {
    case score >= 90:
      result = 'A';
      break;
    case score >= 80:
      result = 'B';
      break;
    default:
      result = 'C';
  }
  return result;
}
console.log(grade(95), grade(85), grade(10));
