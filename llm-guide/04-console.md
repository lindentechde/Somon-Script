# Console Object (чоп)

**Console Methods Mapping**

The `чоп` object maps to JavaScript's `console` object.

---

## Basic Output

| Tajik            | JavaScript        | Purpose     |
| ---------------- | ----------------- | ----------- |
| `чоп.сабт()`     | `console.log()`   | Log message |
| `чоп.хато()`     | `console.error()` | Log error   |
| `чоп.огоҳӣ()`    | `console.warn()`  | Log warning |
| `чоп.маълумот()` | `console.info()`  | Log info    |
| `чоп.исфти()`    | `console.debug()` | Log debug   |

```som
чоп.сабт("Маълумот");              // console.log("Info");
чоп.хато("Хатогӣ");                // console.error("Error");
чоп.огоҳӣ("Огоҳӣ");                // console.warn("Warning");
```

`чоп(…)` called directly prints like `чоп.сабт(…)`: `чоп("Салом")` compiles to
`console.log("Салом")`. A program that declares its own `чоп` calls that one.

```som
чоп("Салом, ҷаҳон!");              // console.log("Салом, ҷаҳон!");
чоп("Ҷавоб:", 6 * 7);
```

---

## Printed values

Programs started with `somon run` (and in the playground) print values with
SomonScript's names, also inside arrays and objects:

| Value                         | Printed as                      |
| ----------------------------- | ------------------------------- |
| `true` / `false`              | `дуруст` / `нодуруст`           |
| `null` / `undefined`          | `холӣ` / `беқимат`              |
| `NaN`                         | `ғайрирақам`                    |
| `Infinity` / `-Infinity`      | `беохир` / `-беохир`            |
| a string at the top level     | as it is: `Салом`               |
| a string in an array/object   | in double quotes: `"Салом"`     |
| `[1, дуруст]`, `{ ном: "А" }` | `[ 1, дуруст ]`, `{ ном: "А" }` |
| a function / class            | `[функсия ном]` / `[синф Ном]`  |
| an error                      | `Хато: паём` (no stack)         |

```som
чоп.сабт(дуруст, холӣ);            // дуруст холӣ
чоп.сабт([1, нодуруст, беқимат]);  // [ 1, нодуруст, беқимат ]
```

Only printing changes; values stay JavaScript's. Converting a value to a string
in the program itself follows JavaScript: `"ҷавоб: " + дуруст` is
`"ҷавоб: true"`, `` `${холӣ}` `` is `"null"`. Pass the value as a separate
argument to print its SomonScript name: `чоп("ҷавоб:", дуруст)`. Compiled
JavaScript run with `node` prints with JavaScript's names (`true`, `null`).

`чоп.тасдиқ(шарт, паём)` prints `Тасдиқ нашуд: паём` when the condition is
false.

---

## Structured Output

| Tajik              | JavaScript         | Purpose        |
| ------------------ | ------------------ | -------------- |
| `чоп.ҷадвал()`     | `console.table()`  | Display table  |
| `чоп.феҳрист()`    | `console.dir()`    | Display object |
| `чоп.xmlФеҳрист()` | `console.dirxml()` | Display XML    |

```som
тағ маълумот = [
    { ном: "Алӣ", синну: 25 },
    { ном: "Фотима", синну: 30 }
];
чоп.ҷадвал(маълумот);
// console.table(data);
```

---

## Grouping

| Tajik               | JavaScript                 | Purpose         |
| ------------------- | -------------------------- | --------------- |
| `чоп.гуруҳ()`       | `console.group()`          | Start group     |
| `чоп.гуруҳПӯшида()` | `console.groupCollapsed()` | Start collapsed |
| `чоп.гуруҳОхир()`   | `console.groupEnd()`       | End group       |

```som
чоп.гуруҳ("Корбарон");
чоп.сабт("Алӣ");
чоп.сабт("Фотима");
чоп.гуруҳОхир();
// console.group("Users");
// console.log("Ali");
// console.log("Fatima");
// console.groupEnd();
```

---

## Timing

| Tajik            | JavaScript          | Purpose     |
| ---------------- | ------------------- | ----------- |
| `чоп.вақт()`     | `console.time()`    | Start timer |
| `чоп.вақтСабт()` | `console.timeLog()` | Log timer   |
| `чоп.вақтОхир()` | `console.timeEnd()` | End timer   |

```som
чоп.вақт("операция");
// ... код ...
чоп.вақтСабт("операция");
// ... код ...
чоп.вақтОхир("операция");
```

---

## Counting

| Tajik           | JavaScript             | Purpose     |
| --------------- | ---------------------- | ----------- |
| `чоп.қайд()`    | `console.count()`      | Count calls |
| `чоп.қайдАсл()` | `console.countReset()` | Reset count |

```som
функсия test() {
    чоп.қайд("функсия даъват");
}
test();  // функсия даъват: 1
test();  // функсия даъват: 2
чоп.қайдАсл("функсия даъват");
```

---

## Debugging

| Tajik          | JavaScript         | Purpose       |
| -------------- | ------------------ | ------------- |
| `чоп.тасдиқ()` | `console.assert()` | Assertion     |
| `чоп.пайҷо()`  | `console.trace()`  | Stack trace   |
| `чоп.полиз()`  | `console.clear()`  | Clear console |

```som
чоп.тасдиқ(х > 0, "х бояд мусбат бошад");
// console.assert(x > 0, "x must be positive");

чоп.пайҷо();
// console.trace();
```

---

## Complete Method List

```som
чоп.сабт();          // console.log()
чоп.хато();          // console.error()
чоп.огоҳӣ();         // console.warn()
чоп.маълумот();      // console.info()
чоп.исфти();         // console.debug()
чоп.ҷадвал();        // console.table()
чоп.феҳрист();       // console.dir()
чоп.xmlФеҳрист();    // console.dirxml()
чоп.гуруҳ();         // console.group()
чоп.гуруҳПӯшида();   // console.groupCollapsed()
чоп.гуруҳОхир();     // console.groupEnd()
чоп.вақт();          // console.time()
чоп.вақтСабт();      // console.timeLog()
чоп.вақтОхир();      // console.timeEnd()
чоп.қайд();          // console.count()
чоп.қайдАсл();       // console.countReset()
чоп.тасдиқ();        // console.assert()
чоп.пайҷо();         // console.trace()
чоп.полиз();         // console.clear()
```

---

**Next**: [Math Object](05-math.md)
