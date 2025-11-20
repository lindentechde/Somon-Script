# Types & Operators

**Type System and Operators**

---

## Basic Types

| Tajik     | TypeScript  | Example                    |
| --------- | ----------- | -------------------------- |
| `рақам`   | `number`    | `тағ х: рақам = 42;`       |
| `сатр`    | `string`    | `тағ с: сатр = "салом";`   |
| `мантиқӣ` | `boolean`   | `тағ м: мантиқӣ = дуруст;` |
| `ҳама`    | `any`       | `тағ а: ҳама = 123;`       |
| `холӣ`    | `void`      | `функсия ф(): холӣ { }`    |
| `ҳеҷ`     | `null`      | `тағ н = ҳеҷ;`             |
| `беқимат` | `undefined` | `тағ б = беқимат;`         |

---

## Boolean Values

| Tajik      | JavaScript |
| ---------- | ---------- |
| `дуруст`   | `true`     |
| `нодуруст` | `false`    |

**Important**: Use `дуруст`/`нодуруст`, NOT `рост`!

---

## Complex Types

### Union Types

```som
тағ результат: рақам | сатр = 100;
// let result: number | string = 100;
```

### Intersection Types

```som
нав AB = A & B;
// type AB = A & B;
```

### Array Types

```som
тағ рақамҳо: рақам[] = [1, 2, 3];
// let numbers: number[] = [1, 2, 3];
```

### Tuple Types

```som
тағ нуқта: [рақам, рақам] = [10, 20];
// let point: [number, number] = [10, 20];
```

---

## Arithmetic Operators

| Operator | Meaning        | Example  |
| -------- | -------------- | -------- |
| `+`      | Addition       | `а + б`  |
| `-`      | Subtraction    | `а - б`  |
| `*`      | Multiplication | `а * б`  |
| `/`      | Division       | `а / б`  |
| `%`      | Modulo         | `а % б`  |
| `**`     | Exponentiation | `а ** б` |

---

## Comparison Operators

| Operator | Meaning           | Example   |
| -------- | ----------------- | --------- |
| `==`     | Equality          | `а == б`  |
| `!=`     | Inequality        | `а != б`  |
| `===`    | Strict equality   | `а === б` |
| `!==`    | Strict inequality | `а !== б` |
| `<`      | Less than         | `а < б`   |
| `>`      | Greater than      | `а > б`   |
| `<=`     | Less or equal     | `а <= б`  |
| `>=`     | Greater or equal  | `а >= б`  |

---

## Logical Operators

| Operator | Meaning            | Example    |
| -------- | ------------------ | ---------- |
| `&&`     | AND                | `а && б`   |
| `\|\|`   | OR                 | `а \|\| б` |
| `!`      | NOT                | `!а`       |
| `??`     | Nullish coalescing | `а ?? б`   |

---

## Assignment Operators

| Operator | Meaning         | Example   |
| -------- | --------------- | --------- |
| `=`      | Assignment      | `а = б`   |
| `+=`     | Add assign      | `а += б`  |
| `-=`     | Subtract assign | `а -= б`  |
| `*=`     | Multiply assign | `а *= б`  |
| `/=`     | Divide assign   | `а /= б`  |
| `%=`     | Modulo assign   | `а %= б`  |
| `**=`    | Exponent assign | `а **= б` |

---

## Unary Operators

| Operator | Meaning     | Example           |
| -------- | ----------- | ----------------- |
| `++`     | Increment   | `а++` or `++а`    |
| `--`     | Decrement   | `а--` or `--а`    |
| `+`      | Unary plus  | `+а`              |
| `-`      | Unary minus | `-а`              |
| `!`      | NOT         | `!а`              |
| `typeof` | Type of     | `typeof а`        |
| `delete` | Delete      | `delete obj.prop` |

---

## Bitwise Operators

| Operator | Meaning              |
| -------- | -------------------- |
| `&`      | Bitwise AND          |
| `\|`     | Bitwise OR           |
| `^`      | Bitwise XOR          |
| `~`      | Bitwise NOT          |
| `<<`     | Left shift           |
| `>>`     | Right shift          |
| `>>>`    | Unsigned right shift |

---

## Special Operators

| Operator | Purpose            | Example         |
| -------- | ------------------ | --------------- |
| `?.`     | Optional chaining  | `obj?.prop`     |
| `??`     | Nullish coalescing | `а ?? б`        |
| `...`    | Spread/Rest        | `...arr`        |
| `? :`    | Ternary            | `а > б ? а : б` |

---

**Next**: [Console Methods](04-console.md)
