# Object Methods (объект)

## Static Methods

| Tajik                      | JavaScript                           |
| -------------------------- | ------------------------------------ |
| `объект.таъин()`           | `Object.assign()`                    |
| `объект.сохтан()`          | `Object.create()`                    |
| `объект.муайянХосиятҳо()`  | `Object.defineProperties()`          |
| `объект.муайянХосият()`    | `Object.defineProperty()`            |
| `объект.воридот()`         | `Object.entries()`                   |
| `объект.яхКардан()`        | `Object.freeze()`                    |
| `объект.азВоридот()`       | `Object.fromEntries()`               |
| `объект.тавсифиХосият()`   | `Object.getOwnPropertyDescriptor()`  |
| `объект.тавсифиХосиятҳо()` | `Object.getOwnPropertyDescriptors()` |
| `объект.номҳоиХосият()`    | `Object.getOwnPropertyNames()`       |
| `объект.рамзҳоиХосият()`   | `Object.getOwnPropertySymbols()`     |
| `объект.прототип()`        | `Object.getPrototypeOf()`            |
| `объект.гурӯҳбандӣ()`      | `Object.groupBy()`                   |
| `объект.дорадХосият()`     | `Object.hasOwn()`                    |
| `объект.аст()`             | `Object.is()`                        |
| `объект.васеъшаванда()`    | `Object.isExtensible()`              |
| `объект.яхшуда()`          | `Object.isFrozen()`                  |
| `объект.мӯҳршуда()`        | `Object.isSealed()`                  |
| `объект.калидҳо()`         | `Object.keys()`                      |
| `объект.манъиВасеъшавӣ()`  | `Object.preventExtensions()`         |
| `объект.мӯҳр()`            | `Object.seal()`                      |
| `объект.танзимиПрототип()` | `Object.setPrototypeOf()`            |
| `объект.қиматҳо()`         | `Object.values()`                    |

## Examples

```som
тағ obj = { ном: "Алӣ", синну: 25 };
тағ калидҳо = объект.калидҳо(obj);      // ["ном", "синну"]
тағ қиматҳо = объект.қиматҳо(obj);      // ["Алӣ", 25]
тағ воридот = объект.воридот(obj);      // [["ном", "Алӣ"], ["синну", 25]]
```

## Property Names That Match Built-in Aliases

The Tajik method and property aliases (`дарозӣ` → `length`, `илова` → `push`,
`маълумот` → `info`, …) are translated wherever they appear as a member name:
after `.`, as object literal keys (including shorthand), as class members and as
destructuring keys. Your own objects therefore keep working when you use such a
name, but the emitted JavaScript uses the English name:

```som
тағ о = { дарозӣ: 5 };
чоп.сабт(о.дарозӣ); // 5 — emitted as `{length: 5}` and `о.length`
чоп.сабт(JSON.stringify(о)); // {"length":5}
```

Pick a different name if the key must appear unchanged in the output, for
example in JSON sent to another program.

Destructuring keys are translated too, so destructuring an object that was not
created by SomonScript (parsed JSON, a JavaScript library) with such a key reads
the English property instead: `собит { вақт } = JSON.parse('{"вақт": 7}')` looks
up `time` and binds `undefined`. Use a non-aliased name there, or map the key
explicitly with a quoted key: `собит { "вақт": вақт } = …`.

Exported names follow the same rule: `содир функсия илова` is exported as
`push`, and `ворид { илова }` and `Л.илова` on a namespace import both look up
`push`, so SomonScript modules work together. A JavaScript module importing it
must use the English name.

---

## Properties named like built-in members

Built-in member names are translated for every object, so an own property named
`дарозӣ`, `илова`, `хато`, `вақт`, `маълумот`, … is renamed too: `{ дарозӣ: 5 }`
compiles to `{ length: 5 }`, prints as `{ length: 5 }`, and `Object.keys` gives
`"length"`. Reading it with `о.дарозӣ` works (it is `о.length` too), but data
from outside with the Tajik key (`JSON.parse('{"дарозӣ": 7}')`) needs
`о["дарозӣ"]`. Prefer other names (`дарозии_қуттӣ`); the learning mode
(`"режим": "таълимӣ"`, `docs/reference/learning-mode.md`) warns about them.
