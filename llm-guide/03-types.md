# Types & Operators

**Type System and Operators**

---

## Basic Types

| Tajik      | TypeScript  | Example                               |
| ---------- | ----------- | ------------------------------------- |
| `рақам`    | `number`    | `тағ х: рақам = 42;`                  |
| `сатр`     | `string`    | `тағ с: сатр = "салом";`              |
| `мантиқӣ`  | `boolean`   | `тағ м: мантиқӣ = дуруст;`            |
| `ҳар`      | `any`       | `тағ а: ҳар = 123;`                   |
| `беджавоб` | `void`      | `функсия ф(): беджавоб { }`           |
| `холӣ`     | `null`      | `тағ н = холӣ;`                       |
| `беқимат`  | `undefined` | `тағ б = беқимат;`                    |
| `ношинос`  | `unknown`   | `тағ у: ношинос = 1;`                 |
| `абадан`   | `never`     | `функсия х(): абадан` (never returns) |
| `объект`   | `object`    | `тағ о: объект = {};`                 |

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
навъ AB = A & B;
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

`навъи а` / `typeof а` returns JavaScript's type names, so compare with
`"string"`, `"number"`, `"boolean"`, `"object"`, … — never with the Tajik type
names: `навъи а === "сатр"` is always false.

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

## Strict Mode (`--strict`)

`somon compile --strict`, `somon run --strict` and
`compile(source, { strict: true })` make every type error fatal and turn on
TypeScript-style checks:

- **Null checks.** `холӣ` and `беқимат` are only assignable to types that
  include them (`Г | холӣ`), and a value that may be `холӣ`/`беқимат` cannot be
  dereferenced or used in arithmetic or comparisons until a check narrows it.
- **Built-ins that may return `беқимат`.** `.баровардан()` (pop),
  `.ҳазфиАввал()` (shift), `.дар()` (at), `.кофтан()` (find), `.охиринЁфтан()`
  (findLast) and `Map` `.бозгирифтан()` (get) return `Т | беқимат`. Optional
  parameters (`а?: рақам`) and optional properties include `беқимат` too.
- **Unknown members.** Reading a member that an array, string, number, `Map`,
  `Set`, class, interface or object type doesn't have is an error (without
  `--strict` it is a warning). Objects built from a literal (`тағ о = {}`) may
  still gain members later, as in JavaScript.

The checker follows the control flow, so these checks narrow a variable or a
member path such as `ин.сар.навбатӣ`:

```som
синф Гиреҳ {
    қимат: рақам;
    навбатӣ: Гиреҳ | холӣ = холӣ;
    конструктор(қимат: рақам) {
        ин.қимат = қимат;
    }
}

функсия ҷамъ(сар: Гиреҳ | холӣ): рақам {
    тағ натиҷа = 0;
    тағ ҷорӣ = сар;
    то (ҷорӣ !== холӣ) {            // ҷорӣ is a Гиреҳ inside the loop
        натиҷа += ҷорӣ.қимат;
        ҷорӣ = ҷорӣ.навбатӣ;
    }
    бозгашт натиҷа;
}

функсия аввал(сар: Гиреҳ | холӣ): рақам {
    агар (сар === холӣ) {
        бозгашт 0;                   // after this, сар is a Гиреҳ
    }
    бозгашт сар.қимат;
}

собит ҳисобҳо = нав Map<сатр, рақам>();
собит ҳисоб = ҳисобҳо.бозгирифтан("а") ?? 0;   // рақам, not рақам | беқимат
```

Narrowing checks: `!== холӣ`, `=== холӣ`, `!= холӣ` (also excludes `беқимат`),
`=== беқимат`, truthiness (`агар (х)`), `!`, `&&`, `||`, `? :`,
`навъи х === "number"`, `instanceof`, early `бозгашт`/`партофтан`/`шикастан`/
`давом`, and assignments. `х?.ном` and `х ?? пешфарз` accept a nullable `х`.
When you know more than the checker, assert it: `х!` removes `холӣ`/`беқимат`,
`х чун Т` asserts a type, and `х бармесоё Т` checks a value against a type while
keeping its own (see [Operators](14-operators.md)).

---

**Next**: [Console Methods](04-console.md)
