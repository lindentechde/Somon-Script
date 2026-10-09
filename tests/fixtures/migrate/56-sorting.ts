// Sorting with comparators
interface Student {
  name: string;
  grade: number;
}
const students: Student[] = [
  { name: 'Zarina', grade: 90 },
  { name: 'Ali', grade: 85 },
  { name: 'Bahrom', grade: 90 },
  { name: 'Dilnoza', grade: 70 },
];

const byGradeThenName = [...students].sort(
  (a, b) => b.grade - a.grade || a.name.localeCompare(b.name)
);
console.log(byGradeThenName.map(s => s.name).join(', '));

const words = ['banana', 'Apple', 'cherry'];
console.log(
  [...words].sort(),
  [...words].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
);
console.log(
  [10, 9, 1, 100].sort(),
  [10, 9, 1, 100].sort((a, b) => a - b)
);
const grouped = students.reduce<Record<number, string[]>>((acc, s) => {
  (acc[s.grade] ??= []).push(s.name);
  return acc;
}, {});
console.log(grouped);
