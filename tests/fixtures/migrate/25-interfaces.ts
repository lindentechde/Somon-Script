// Interfaces, optional and readonly members, implements
interface Identified {
  readonly id: number;
}
interface Named {
  name: string;
  nickname?: string;
}
interface Person extends Identified, Named {
  greet(other: Named): string;
}
interface Dictionary {
  [key: string]: number;
}

class Student implements Person {
  constructor(
    readonly id: number,
    public name: string
  ) {}
  greet(other: Named): string {
    return `${this.name} greets ${other.nickname ?? other.name}`;
  }
}

const s: Person = new Student(7, 'Ali');
console.log(s.greet({ name: 'Vali', nickname: 'V' }), s.greet({ name: 'Sami' }));
const counts: Dictionary = { a: 1 };
counts['b'] = 2;
console.log(JSON.stringify(counts), s.id);
