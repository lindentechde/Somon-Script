// Error handling
class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validate(age: number): number {
  if (age < 0) throw new ValidationError('negative age', 'age');
  if (!Number.isInteger(age)) throw new TypeError('not an integer');
  return age;
}

for (const value of [5, -1, 2.5]) {
  try {
    console.log('valid', validate(value));
  } catch (e: unknown) {
    if (e instanceof ValidationError) console.log(e.name, e.message, e.field);
    else if (e instanceof Error) console.log('other', e.message);
  } finally {
    console.log('checked', value);
  }
}

try {
  JSON.parse('{');
} catch {
  console.log('bad json');
}

function cleanup(): string {
  try {
    return 'try';
  } finally {
    console.log('finally runs');
  }
}
console.log(cleanup());
const err = new Error('plain');
console.log(err instanceof Error, err.message, String(err));
