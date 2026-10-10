# Keywords Reference

**Complete Keyword Mappings**

---

## Variables

| Tajik   | JavaScript | Usage              |
| ------- | ---------- | ------------------ |
| `тағ`   | `let`      | Mutable variable   |
| `собит` | `const`    | Immutable constant |

```som
тағ ном = "Аҳмад";              // let name = "Ahmad";
собит ПИ = 3.14159;             // const PI = 3.14159;
```

---

## Control Flow

| Tajik          | JavaScript | Purpose          |
| -------------- | ---------- | ---------------- |
| `агар`         | `if`       | If statement     |
| `вагарна`      | `else`     | Else clause      |
| `вагарна агар` | `else if`  | Else-if          |
| `интихоб`      | `switch`   | Switch statement |
| `ҳолат`        | `case`     | Case clause      |
| `пешфарз`      | `default`  | Default case     |
| `шикастан`     | `break`    | Break            |
| `давом`        | `continue` | Continue         |

---

## Loops

| Tajik   | JavaScript | Type       |
| ------- | ---------- | ---------- |
| `то`    | `while`    | While loop |
| `барои` | `for`      | For loop   |
| `дар`   | `in`       | For-in     |
| `аз`    | `of`       | For-of     |

```som
то (і < 10) { і++; }                    // while (i < 10) { i++; }
барои (тағ і = 0; і < 10; і++) { }      // for (let i = 0; i < 10; i++) { }
барои (тағ к дар obj) { }               // for (let k in obj) { }
барои (тағ в аз arr) { }                // for (let v of arr) { }
барои (собит [к, в] аз объект.воридот(obj)) { }  // for (const [k, v] of Object.entries(obj)) { }
```

```som
кун { і++; } то (і < 10);               // do { i++; } while (i < 10);
ҳамзамон функсия хондан(ҷараён: AsyncIterable<сатр>) {
    барои интизор (собит х аз ҷараён) { }   // for await (const x of stream) { }
}
```

`кун` is a keyword only before `{`. Labels work as in JavaScript:
`берун: барои (…) { … шикастан берун; }`. See [Operators](14-operators.md) for
every operator and statement.

---

## Functions

| Tajik     | JavaScript | Purpose              |
| --------- | ---------- | -------------------- |
| `функсия` | `function` | Function declaration |
| `бозгашт` | `return`   | Return statement     |

```som
функсия ҷамъ(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}
// function sum(a: number, b: number): number {
//     return a + b;
// }
```

---

## Classes

| Tajik         | JavaScript    | Purpose           |
| ------------- | ------------- | ----------------- |
| `синф`        | `class`       | Class declaration |
| `мерос`       | `extends`     | Inheritance       |
| `татбиқ`      | `implements`  | Implements        |
| `конструктор` | `constructor` | Constructor       |
| `ин`          | `this`        | This reference    |
| `супер`       | `super`       | Super reference   |
| `нав`         | `new`         | Instantiation     |

### Access Modifiers

| Tajik           | JavaScript/TypeScript |
| --------------- | --------------------- |
| `ҷамъиятӣ`      | `public`              |
| `хосусӣ`        | `private`             |
| `муҳофизатшуда` | `protected`           |
| `статикӣ`       | `static`              |
| `мавҳум`        | `abstract`            |

---

## Modules

| Tajik    | JavaScript | Purpose                          |
| -------- | ---------- | -------------------------------- |
| `ворид`  | `import`   | Import statement                 |
| `содир`  | `export`   | Export statement                 |
| `чун`    | `as`       | Alias                            |
| `мавқуф` | `defer`    | Deferred import (`ворид мавқуф`) |

```som
ворид { ҷамъ } аз "./math";             // import { sum } from "./math.js";
содир функсия тафриқ() { }             // export function subtract() { }
ворид * чун Utils аз "./utils";        // import * as Utils from "./utils.js";
ворид мавқуф * чун Ҳисоб аз "./ҳисоб";  // import defer * as Ҳисоб from "./ҳисоб.js";
```

`мавқуф` means "postponed, put off" (`мавқуф гузоштан`, to defer): the import is
kept, its module runs later, when it is first used. Like `эълон`, `дастрасӣ` and
`истифода`, it is a single common word for the English one, and it is a keyword
only right after `ворид`.

---

## Async/Await

| Tajik      | JavaScript | Purpose          |
| ---------- | ---------- | ---------------- |
| `ҳамзамон` | `async`    | Async function   |
| `интизор`  | `await`    | Await expression |
| `Ваъда`    | `Promise`  | Promise type     |

```som
ҳамзамон функсия getData() {
    тағ data = интизор fetch(url);
    бозгашт data;
}
// async function getData() {
//     let data = await fetch(url);
//     return data;
// }
```

---

## Error Handling

| Tajik       | JavaScript | Purpose           |
| ----------- | ---------- | ----------------- |
| `кӯшиш`     | `try`      | Try block         |
| `гирифтан`  | `catch`    | Catch block       |
| `ниҳоят`    | `finally`  | Finally block     |
| `партофтан` | `throw`    | Throw statement   |
| `Хато`      | `Error`    | Error constructor |

```som
кӯшиш {
    партофтан нав Хато("Хатогӣ");
} гирифтан (е) {
    чоп.хато(е);
} ниҳоят {
    чоп.сабт("Анҷом");
}
```

As in TypeScript, the binding may be typed `ношинос` (unknown) or `ҳар` (any)
and nothing else, or be a destructuring pattern:

```som
кӯшиш {
    партофтан нав Хато("Хатогӣ");
} гирифтан (е: ношинос) {
    агар (е instanceof Хато) чоп.хато(е.message);
}
```

---

## Type System

| Tajik       | TypeScript  | Purpose    |
| ----------- | ----------- | ---------- |
| `интерфейс` | `interface` | Interface  |
| `навъ`      | `type`      | Type alias |
| `номфазо`   | `namespace` | Namespace  |

```som
интерфейс Корбар {
    ном: сатр;
    синну: рақам;
}

навъ Адад = рақам | сатр;
```

---

## English Keywords

TypeScript's English spelling of these keywords works too, wherever the Tajik
one does, so code moved from TypeScript keeps working while it is translated:

| English                             | Tajik                                  |
| ----------------------------------- | -------------------------------------- |
| `return`, `throw`, `else`           | `бозгашт`, `партофтан`, `вагарна`      |
| `new`, `function`, `this`, `super`  | `нав`, `функсия`, `ин`, `супер`        |
| `case`, `default`                   | `ҳолат`, `пешфарз`                     |
| `async`, `await`                    | `ҳамзамон`, `интизор`                  |
| `in`, `of` (`for … of`)             | `дар`, `аз`                            |
| `true`, `false`, `null`             | `дуруст`, `нодуруст`, `холӣ`           |
| `static`, `public`, `private`       | `статикӣ`, `ҷамъиятӣ`, `хосусӣ`        |
| `protected`, `readonly`, `abstract` | `муҳофизатшуда`, `танҳохонӣ`, `мавҳум` |
| `extends`, `implements`, `keyof`    | `мерос`, `татбиқ`, `калидҳои`          |

`typeof`, `void`, `delete`, `instanceof`, `do`, `yield`, `as`, `satisfies`,
`is`, `asserts`, `infer`, `declare`, `override`, `accessor`, `using`, `enum`,
`type`, `module`, `global`, `unique` and `defer` work as well. `async`, `of`,
`readonly`, `abstract`, `keyof` and `unique` remain usable as names, and every
keyword, English or Tajik, may name a member (`о.return`, `{ нав: 1 }`). The
other statement keywords (`if`, `for`, `while`, `let`, `const`, `class`, `try`,
`import`, `export`, …) have only their Tajik form.

```som
abstract синф Шакл {
    abstract масоҳат(): рақам;
}
синф Доира extends Шакл {
    конструктор(private readonly радиус: рақам) {
        super();
    }
    масоҳат(): рақам {
        return Math.PI * this.радиус ** 2;
    }
}
async function ҳисоб(): Ваъда<рақам> {
    барои (собит ш of [нав Доира(1)]) {
        агар (ш.масоҳат() > 3) return 1; else return 0;
    }
    throw new Error("холӣ");
}
```

---

**Next**: [Types & Operators](03-types.md)
