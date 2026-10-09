# Operators

**Every TypeScript operator and statement, and how to write it in SomonScript**

Words marked _contextual_ are keywords only where they have that meaning, so
programs may still use them as ordinary names elsewhere (`тағ ҳосил = 1;`).

---

## Expression Operators

| TypeScript                 | SomonScript               | Notes                                  |
| -------------------------- | ------------------------- | -------------------------------------- |
| `+ - * / % **`             | `+ - * / % **`            |                                        |
| `++ --` (prefix, postfix)  | `++ --`                   |                                        |
| `= += -= *= /= %= **=`     | same                      |                                        |
| `<<= >>= >>>= &= \|= ^=`   | same                      |                                        |
| `&&= \|\|= ??=`            | same                      |                                        |
| `== != === !== < > <= >=`  | same                      |                                        |
| `&& \|\| ! ??`             | same                      |                                        |
| `& \| ^ ~ << >> >>>`       | same                      |                                        |
| `a ? b : c`                | same                      |                                        |
| `a, b`                     | same                      | comma operator                         |
| `typeof x`                 | `навъи х`                 | `typeof` also works                    |
| `void x`, `delete o.x`     | same                      |                                        |
| `"x" in o`                 | `"х" дар о`               | `in` also works                        |
| `x instanceof C`           | same                      |                                        |
| `o?.x`, `o?.[i]`, `f?.()`  | same                      |                                        |
| `...x`                     | same                      | spread and rest                        |
| `new C()`                  | `нав К()`                 |                                        |
| `new.target`               | `нав.target`              |                                        |
| `await x`                  | `интизор х`               |                                        |
| `yield x`, `yield* xs`     | `ҳосил х`, `ҳосил* хҳо`   | contextual, inside `функсия*`; `yield` |
| `(x) => x`                 | same                      | `ҳамзамон (х) => …` is async           |
| `` tag`a${x}` ``           | same                      | tagged template                        |
| `/a+/g`                    | same                      | regular expression literal             |
| `#x`, `this.#x`, `#x in o` | `#х`, `ин.#х`, `#х дар о` | private class members                  |
| `super.m()`                | `супер.м()`               |                                        |
| `class { }` (expression)   | `синф { }`                |                                        |
| `x as T`                   | `х чун Т`                 | `as` also works                        |
| `x as const`               | `х чун собит`             | readonly literal types                 |
| `<T>x`                     | `<Т>х`, `<собит>х`        |                                        |
| `x!`                       | `х!`                      | non-null assertion                     |
| `x satisfies T`            | `х бармесоё Т`            | `satisfies` also works                 |
| `<T>(x: T) => x`           | same                      | generic arrow function                 |
| `f<T>(x)`                  | same                      | explicit type arguments                |

```som
собит ҳисобҳо = нав Map<сатр, рақам>();
ҳисобҳо.гузоштан("а", 1);
собит а = ҳисобҳо.бозгирифтан("а")!;          // рақам, not рақам | беқимат
собит ҷавоб: ношинос = JSON.parse('{"ном": "Алӣ"}');
собит ном = (ҷавоб чун { ном: сатр }).ном;
собит ранг = { сурх: 255 } бармесоё сабт_навъ<сатр, рақам>;
собит самтҳо = ["чап", "рост"] чун собит;      // танҳохонӣ ["чап", "рост"]
собит ҳамон = <Т>(х: Т): Т => х;
```

---

## Statements

| TypeScript                  | SomonScript                      | Notes                                 |
| --------------------------- | -------------------------------- | ------------------------------------- |
| `if / else if / else`       | `агар / вагарна агар / вагарна`  |                                       |
| `switch / case / default`   | `интихоб / ҳолат / пешфарз`      |                                       |
| `while (c) { }`             | `то (ш) { }`                     |                                       |
| `do { } while (c);`         | `кун { } то (ш);`                | contextual `кун`; `do` also works     |
| `for (;;)`                  | `барои (;;)`                     |                                       |
| `for (const x of xs)`       | `барои (собит х аз хҳо)`         | patterns: `барои (собит [к, в] аз …)` |
| `for (const k in o)`        | `барои (собит к дар о)`          |                                       |
| `for await (const x of xs)` | `барои интизор (собит х аз хҳо)` | inside `ҳамзамон` functions           |
| `break; continue;`          | `шикастан; давом;`               |                                       |
| `label: …`, `break label;`  | `нишона: …`, `шикастан нишона;`  | also `давом нишона;`                  |
| `return`                    | `бозгашт`                        |                                       |
| `throw`                     | `партофтан`                      |                                       |
| `try / catch / finally`     | `кӯшиш / гирифтан / ниҳоят`      | `гирифтан { }` without a binding      |
| `debugger;`                 | `debugger;`                      |                                       |
| `;`                         | `;`                              | empty statement                       |
| `function* g() { }`         | `функсия* г() { }`               | also `ҳамзамон функсия*`, `*м() {}`   |
| `enum E { A, B = 5 }`       | `шумориш Э { А, Б = 5 }`         | contextual `шумориш`; `enum` too      |
| `const enum E { }`          | `собит шумориш Э { }`            |                                       |

```som
тағ и = 0;
кун {
    и++;
} то (и < 3);

берун: барои (тағ а = 0; а < 3; а++) {
    барои (тағ б = 0; б < 3; б++) {
        агар (б === 1) давом берун;
        агар (а === 2) шикастан берун;
    }
}

шумориш Ранг { Сурх, Сабз = 5 }
чоп.сабт(Ранг.Сабз, Ранг[5]);              // 5 Сабз

функсия* шумораҳо(): Generator<рақам> {
    ҳосил 1;
    ҳосил* [2, 3];
}
чоп.сабт([...шумораҳо()]);                 // [ 1, 2, 3 ]
```

---

## Classes

| TypeScript                           | SomonScript                       |
| ------------------------------------ | --------------------------------- |
| `get x() { }`, `set x(v) { }`        | same (also in object literals)    |
| `static x = 1;`, `static { … }`      | `статикӣ х = 1;`, `статикӣ { … }` |
| `#x = 1;`, `#m() { }`                | same                              |
| `constructor(private x: number)`     | `конструктор(хосусӣ х: рақам)`    |
| `readonly x: number;`                | `танҳохонӣ х: рақам;`             |
| `x!: number;`, `x?: number;`         | same                              |
| `*gen() { }`, `async m() { }`        | `*ген() { }`, `ҳамзамон м() { }`  |
| `abstract class`, `abstract m(): T;` | `мавҳум синф`, `мавҳум м(): Т;`   |

```som
синф Ҳисоб {
    #баланс = 0;
    статикӣ шумора = 0;
    статикӣ {
        Ҳисоб.шумора = 1;
    }
    конструктор(хосусӣ танҳохонӣ соҳиб: сатр) {}
    get баланс(): рақам {
        бозгашт ин.#баланс;
    }
    гузоштанПул(маблағ: рақам): ин {
        ин.#баланс += маблағ;
        бозгашт ин;
    }
}
чоп.сабт(нав Ҳисоб("Алӣ").гузоштанПул(5).гузоштанПул(2).баланс);   // 7
```

---

## Type Operators

| TypeScript                         | SomonScript                                    |
| ---------------------------------- | ---------------------------------------------- |
| `A \| B`, `A & B`                  | same                                           |
| `keyof T`                          | `калидҳои Т`                                   |
| `typeof x` (in a type)             | `навъи х`                                      |
| `T["k"]`, `T[K]`                   | same                                           |
| `T extends U ? X : Y`              | `Т мерос У ? Х : Я`                            |
| `infer U`                          | `инфер У`                                      |
| `{ [K in keyof T]?: T[K] }`        | `{ [К дар калидҳои Т]?: Т[К] }`                |
| `-readonly`, `+?`, `-?`            | `-танҳохонӣ`, `+?`, `-?`                       |
| `[K in keyof T as N]`              | `[К дар калидҳои Т чун Н]`                     |
| `` `pre_${T}` ``                   | same                                           |
| `unique symbol`                    | `беназир рамз`                                 |
| `readonly T[]`, `readonly [A, B]`  | `танҳохонӣ Т[]`, `танҳохонӣ [А, Б]`            |
| `x is T`                           | `х аст Т` (`is` also works)                    |
| `this is T`                        | `ин аст Т`                                     |
| `asserts x`, `asserts x is T`      | `тасдиқ х`, `тасдиқ х аст Т` (`asserts` works) |
| `[A, B?]`, `[A, ...B[]]`, `[x: A]` | same                                           |
| `new (a: A) => T`                  | `нав (а: А) => Т`                              |
| `abstract new () => T`             | `мавҳум нав () => Т`                           |
| `this` (type)                      | `ин`                                           |
| `<T extends U = D>`                | `<Т мерос У = Д>` (`extends` also works)       |

```som
функсия сатрАст(х: ношинос): х аст сатр {
    бозгашт навъи х === "string";
}

функсия тасдиқиСатр(х: ношинос): тасдиқ х аст сатр {
    агар (!сатрАст(х)) партофтан нав Хато("сатр интизор буд");
}

функсия дарозӣ(х: ношинос): рақам {
    тасдиқиСатр(х);
    бозгашт х.length;                       // х is a сатр here
}

навъ Гирандаҳо<Т> = {
    [К дар калидҳои Т чун `гир_${К & сатр}`]: () => Т[К];
};
```

---

## Not Supported

- `import.meta`: the compiler emits CommonJS modules.
- Decorators (`@декоратор`), `declare`, `override`, `accessor` and `using`
  declarations.
- Several variables in one declaration (`тағ а = 1, б = 2;`): declare each one
  separately.

---

**Back to**: [Guide index](README.md)
