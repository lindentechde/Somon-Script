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
