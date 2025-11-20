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

| Tajik           | JavaScript | Purpose          |
| --------------- | ---------- | ---------------- |
| `агар`          | `if`       | If statement     |
| `вагарна`       | `else`     | Else clause      |
| `дар_ҳолати_ки` | `else if`  | Else-if          |
| `интихоб`       | `switch`   | Switch statement |
| `вақте`         | `case`     | Case clause      |
| `пешфарз`       | `default`  | Default case     |
| `шикастан`      | `break`    | Break            |
| `давом`         | `continue` | Continue         |

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
```

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

| Tajik           | JavaScript    | Purpose           |
| --------------- | ------------- | ----------------- |
| `синф`          | `class`       | Class declaration |
| `мерос_мебарад` | `extends`     | Inheritance       |
| `конструктор`   | `constructor` | Constructor       |
| `ин`            | `this`        | This reference    |
| `супер`         | `super`       | Super reference   |
| `нави`          | `new`         | Instantiation     |

### Access Modifiers

| Tajik           | JavaScript/TypeScript |
| --------------- | --------------------- |
| `ҷамъиятӣ`      | `public`              |
| `хосусӣ`        | `private`             |
| `муҳофизатшуда` | `protected`           |
| `статикӣ`       | `static`              |
| `абстрактӣ`     | `abstract`            |

---

## Modules

| Tajik   | JavaScript | Purpose          |
| ------- | ---------- | ---------------- |
| `ворид` | `import`   | Import statement |
| `содир` | `export`   | Export statement |
| `чун`   | `as`       | Alias            |

```som
ворид { ҷамъ } аз "./math";             // import { sum } from "./math.js";
содир функсия тафриқ() { }             // export function subtract() { }
ворид * чун Utils аз "./utils";        // import * as Utils from "./utils.js";
```

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
    партофтан нави Хато("Хатогӣ");
} гирифтан (е) {
    чоп.хато(е);
} ниҳоят {
    чоп.сабт("Анҷом");
}
```

---

## Type System

| Tajik       | TypeScript  | Purpose    |
| ----------- | ----------- | ---------- |
| `интерфейс` | `interface` | Interface  |
| `нав`       | `type`      | Type alias |
| `номфазо`   | `namespace` | Namespace  |

```som
интерфейс Корбар {
    ном: сатр;
    синну: рақам;
}

нав Адад = рақам | сатр;
```

---

**Next**: [Types & Operators](03-types.md)
