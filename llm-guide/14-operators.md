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
| `f<T>`, `new C<T>`         | same                      | instantiation expression, no call      |

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

A `<` after an operand opens type arguments, as in TypeScript, when what follows
it parses as types and the `>` is followed by `(`, a template, a line break, a
binary operator or a token that cannot start an expression. Any type may be a
type argument; otherwise `<` and `>` compare. As in TypeScript,
`ф(а < б, в > (1))` calls `а<б, в>(1)`.

```som
функсия ҳамон<Т>(х: Т): Т { бозгашт х; }
чоп.сабт(ҳамон<ҳар>(1), ҳамон<"а" | "б">("а"), [1, 2].map<сатр>(х => `${х}`));
собит ҳамонРақам = ҳамон<рақам>;           // instantiation expression
собит а = 1, б = 2, в = 3;
чоп.сабт(а < б > в, а < б > +1);         // false false: comparisons
```

---

## Statements

| TypeScript                  | SomonScript                      | Notes                                  |
| --------------------------- | -------------------------------- | -------------------------------------- |
| `let a = 1, b = 2;`         | `тағ а = 1, б = 2;`              | also in `барои (тағ и = 0, ҷ = н; …)`  |
| `if / else if / else`       | `агар / вагарна агар / вагарна`  |                                        |
| `switch / case / default`   | `интихоб / ҳолат / пешфарз`      |                                        |
| `while (c) { }`             | `то (ш) { }`                     |                                        |
| `do { } while (c);`         | `кун { } то (ш);`                | contextual `кун`; `do` also works      |
| `for (;;)`                  | `барои (;;)`                     |                                        |
| `for (const x of xs)`       | `барои (собит х аз хҳо)`         | patterns: `барои (собит [к, в] аз …)`  |
| `for (const k in o)`        | `барои (собит к дар о)`          |                                        |
| `for await (const x of xs)` | `барои интизор (собит х аз хҳо)` | inside `ҳамзамон` functions            |
| `break; continue;`          | `шикастан; давом;`               |                                        |
| `label: …`, `break label;`  | `нишона: …`, `шикастан нишона;`  | also `давом нишона;`                   |
| `return`                    | `бозгашт`                        |                                        |
| `throw`                     | `партофтан`                      |                                        |
| `try / catch / finally`     | `кӯшиш / гирифтан / ниҳоят`      | `гирифтан { }` without a binding       |
| `catch (e: unknown)`        | `гирифтан (е: ношинос)`          | also `ҳар`; a pattern: `({ message })` |
| `debugger;`                 | `debugger;`                      |                                        |
| `;`                         | `;`                              | empty statement                        |
| `function* g() { }`         | `функсия* г() { }`               | also `ҳамзамон функсия*`, `*м() {}`    |
| `enum E { A, B = 5 }`       | `шумориш Э { А, Б = 5 }`         | contextual `шумориш`; `enum` too       |
| `const enum E { }`          | `собит шумориш Э { }`            |                                        |

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

| TypeScript                            | SomonScript                       |
| ------------------------------------- | --------------------------------- |
| `get x() { }`, `set x(v) { }`         | same (also in object literals)    |
| `static x = 1;`, `static { … }`       | `статикӣ х = 1;`, `статикӣ { … }` |
| `#x = 1;`, `#m() { }`                 | same                              |
| `constructor(private x: number)`      | `конструктор(хосусӣ х: рақам)`    |
| `readonly x: number;`                 | `танҳохонӣ х: рақам;`             |
| `x!: number;`, `x?: number;`          | same                              |
| `*gen() { }`, `async m() { }`         | `*ген() { }`, `ҳамзамон м() { }`  |
| `abstract class`, `abstract m(): T;`  | `мавҳум синф`, `мавҳум м(): Т;`   |
| `abstract x: T;`, `abstract get x()`  | `мавҳум х: Т;`, `мавҳум get х()`  |
| `override m() { }`                    | `бознавис м() { }`                |
| `accessor x = 1;`                     | `дастрасӣ х = 1;`                 |
| `declare x: T;`                       | `эълон х: Т;` (no field emitted)  |
| `[key: string]: T;`                   | `[калид: сатр]: Т;`               |
| `[Symbol.iterator]() { }`, `"a b"()`  | same (computed and literal names) |
| `m?(): T;`, `m?() { }`                | same (optional methods)           |
| `m(x: number): T;` before `m(x) { }`  | same (overload signatures)        |
| `get x(): A;` with `set x(v: A \| B)` | same (the setter decides writes)  |
| `@dec m() { }`                        | `@ороиш м() { }` (decorators)     |

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

`бознавис`, `дастрасӣ` and `эълон` are contextual (`override`, `accessor` and
`declare` also work): a member may still be named `бознавис() { }`. As in
TypeScript, any keyword names a member of a class, object literal, interface or
object type, and a member after `.` or `?.`: `агар() { }`, `бозгашт = 1;`,
`{ синф: 1 }`, `о.нав()`. A modifier word is a modifier only when the member
follows it (on its line, except `статикӣ`): `статикӣ() { }` and `хосусӣ = 1;`
are members named `статикӣ` and `хосусӣ`. Interface and object type members may
also be named by a string or a number (`"а-б": рақам;`, `1: сатр;`). The type
checker reports `бознавис` on a member the base class does not have, and on a
class without a base class (TypeScript's TS4113 / TS4112), and `нав` of a
`мавҳум синф`.

```som
мавҳум синф Шакл {
    мавҳум ном: сатр;
    мавҳум get масоҳат(): рақам;
    тавсиф(): сатр {
        бозгашт `${ин.ном}: ${ин.масоҳат}`;
    }
}

синф Мураббаъ мерос Шакл {
    ном = "мураббаъ";
    конструктор(хосусӣ тараф: рақам) {
        супер();
    }
    бознавис get масоҳат(): рақам {
        бозгашт ин.тараф ** 2;
    }
    бознавис тавсиф(): сатр {
        бозгашт "□ " + супер.тавсиф();
    }
}

синф Луғат {
    [калид: сатр]: рақам;           // index signature
    дастрасӣ андоза = 0;            // auto-accessor: a getter/setter pair
    *[Symbol.iterator]() {          // computed name
        ҳосил ин.андоза;
    }
}
чоп.сабт(нав Мураббаъ(3).тавсиф());      // □ мураббаъ: 9
```

---

## Decorators

| TypeScript                           | SomonScript                      |
| ------------------------------------ | -------------------------------- |
| `@dec class C { }`                   | `@ороиш синф К { }`              |
| `@dec export class C { }`            | `@ороиш содир синф К { }`        |
| `export @dec class C { }`            | `содир @ороиш синф К { }`        |
| `@a.b(1)`, `@(expr)`                 | same                             |
| `const C = @dec class { };`          | `собит К = @ороиш синф { };`     |
| `@dec m() { }`, `@dec x = 1;`        | same, also accessors, `дастрасӣ` |
| `constructor(@inject x: T)` (legacy) | `конструктор(@тазриқ х: Т)`      |

Decorators are the standard (TC39 / TypeScript 5) ones: a decorator receives the
value and a context (`kind`, `name`, `static`, `addInitializer`, …) and may
return a replacement. No JavaScript runtime runs decorators yet, so when a
program uses them (or `дастрасӣ`), the compiler lowers it with TypeScript, for
every target (`--target esnext` included); the output then has TypeScript's
formatting and helper functions.

```som
функсия сабт(метод: ҳар, контекст: ҳар) {
    бозгашт функсия (ин: ҳар, ...аргументҳо: ҳар[]) {
        чоп.сабт(`${контекст.name}(${аргументҳо.join(", ")})`);
        бозгашт метод.call(ин, ...аргументҳо);
    };
}

функсия мӯҳр(Синф: ҳар, контекст: ҳар) {
    контекст.addInitializer(() => чоп.сабт(`синф ${контекст.name}`));
}

@мӯҳр
синф Ҳисобгар {
    @сабт
    ҷамъ(а: рақам, б: рақам): рақам {
        бозгашт а + б;
    }
}
чоп.сабт(нав Ҳисобгар().ҷамъ(2, 3));      // синф Ҳисобгар, ҷамъ(2, 3), 5
```

TypeScript's legacy decorators (`experimentalDecorators`), which may also
decorate parameters, need the `experimentalDecorators` option:
`somon compile --experimental-decorators` (also `run`, `bundle`),
`"compilerOptions": { "experimentalDecorators": true }` in `somon.config.json`,
or `compile(source, { experimentalDecorators: true })`. Without it a parameter
decorator is an error.

```text
функсия тазриқ(калид: сатр) {
    бозгашт (Синф: ҳар, _: беқимат, ҷой: рақам) => чоп.сабт(калид, ҷой);
}
синф Хизмат {
    конструктор(@тазриқ("пайваст") хосусӣ пайваст: ҳар) {}
}
```

`emitDecoratorMetadata` is not supported: the type checker does not keep the
types it needs.

---

## Declarations

| TypeScript                       | SomonScript                         | Notes                                     |
| -------------------------------- | ----------------------------------- | ----------------------------------------- |
| `declare const x: T;`            | `эълон собит х: Т;`                 | also `эълон тағ`                          |
| `declare function f(x: T): U;`   | `эълон функсия ф(х: Т): У;`         |                                           |
| `declare class C { m(): T; }`    | `эълон синф К { м(): Т; }`          | members without bodies                    |
| `declare enum E { }`             | `эълон шумориш Э { }`               |                                           |
| `declare namespace N { }`        | `эълон номфазо Н { }`               | also `эълон модул Н { }`                  |
| `declare module "m" { }`         | `эълон модул "м" { }`               | types what `"м"` exports                  |
| `declare global { }`             | `эълон глобалӣ { }`                 | global names, built-in types              |
| `using r = open();`              | `истифода р = кушодан();`           | contextual; `using` too                   |
| `await using r = open();`        | `интизор истифода р = кушодан();`   | in `ҳамзамон` functions                   |
| `for (using r of rs)`            | `барои (истифода р аз рҳо)`         | also `барои интизор (интизор истифода …)` |
| `import type { T } from "m";`    | `ворид навъ { Т } аз "м";`          | no `require` in the output                |
| `import { type T, x } from "m";` | `ворид { навъ Т, х } аз "м";`       |                                           |
| `export type { T };`             | `содир навъ { Т };`                 | also `содир навъ { Т } аз "м";`           |
| `import x = require("m");`       | `ворид х = require("м");`           | CommonJS interop                          |
| `import x = N.a;`                | `ворид х = Н.а;`                    | alias                                     |
| `export = x;`                    | `содир = х;`                        | the only export of the module             |
| `#!/usr/bin/env node`            | same, on the first line             | kept as the output's first line           |
| `function f(x: number): number;` | `функсия ф(х: рақам): рақам;`       | overload signature                        |
| `function f(this: T, x: U)`      | `функсия ф(ин: Т, х: У)`            | `this` parameter, erased                  |
| `<const T>`, `<in T>`, `<out T>` | `<собит Т>`, `<дар Т>`, `<берун Т>` | type parameter modifiers                  |

`эълон` (`declare`) declares what exists at run time elsewhere (the host,
another script): it is erased from the output, and the type checker uses the
declared types. `модул` and `глобалӣ` are keywords only after `эълон`; the
English `declare`, `module`, `global`, `using`, `type` work as well.

```som
эълон собит ВЕРСИЯ: сатр;
эълон функсия форматКун(н: рақам): сатр;
эълон синф Ҳисобгар {
    конструктор(аввал: рақам);
    зам(н: рақам): ин;
    қимат: рақам;
}
эълон модул "китобхона" {
    содир функсия салом(ном: сатр): сатр;
}
эълон глобалӣ {
    интерфейс Array<Т> { охирин(): Т | беқимат; }
}

ворид { салом } аз "китобхона";      // салом: (ном: сатр) => сатр
ворид навъ { Танзимот } аз "./танзимот";   // types only: nothing is loaded
```

`истифода` declares a constant whose value is disposed of when its block ends,
also by a `бозгашт` or an exception: `[Symbol.dispose]()` is called, and
`интизор истифода` awaits `[Symbol.asyncDispose]()`, in reverse order. The
compiler lowers it with TypeScript. Node.js 20.4+ (and 22, 24) defines
`Symbol.dispose` and `Symbol.asyncDispose`, so no polyfill is emitted; where
they are missing (older browsers, a `vm` context) define them before the program
runs.

```som
функсия кушодан(ном: сатр) {
    чоп.сабт("кушодан", ном);
    бозгашт { ном, [Symbol.dispose]() { чоп.сабт("бастан", ном); } };
}

функсия кор() {
    истифода файл = кушодан("маълумот.txt");
    истифода қулф = кушодан("қулф");
    чоп.сабт("кор бо", файл.ном);
}   // бастан қулф, бастан маълумот.txt
кор();
```

Overload signatures come right before the function (or method, or constructor)
they describe. Calls are checked against the signatures — a call that matches
none is an error — and the implementation's own signature is not callable from
outside. A parameter named `ин` first in the list types `ин` in the body and is
not a parameter of calls.

```som
функсия дубора(х: рақам): рақам;
функсия дубора(х: сатр): сатр;
функсия дубора(х: ҳар): ҳар {
    бозгашт х + х;
}
тағ а: рақам = дубора(2);
тағ б: сатр = дубора("ҳа");

интерфейс Ҳисоб { баланс: рақам; }
функсия илова(ин: Ҳисоб, маблағ: рақам): рақам {
    ин.баланс += маблағ;
    бозгашт ин.баланс;
}
чоп.сабт(илова.call({ баланс: 1 }, 2));   // 3

функсия ҳамон<собит Т>(х: Т): Т { бозгашт х; }   // х stays a literal type
интерфейс Истеҳсолгар<берун Т> { гир(): Т; }
```

### Declaration merging

Interfaces with one name are one interface. Namespaces with one name merge, and
a namespace merges with a class, function or enum declared before it; enums with
one name merge. Merged namespaces and enums are emitted the way TypeScript emits
them, and a namespace block reads what the other blocks export (`Н.а`); a single
namespace keeps its usual output.

```som
интерфейс Корбар { ном: сатр; }
интерфейс Корбар { синну: рақам; }
собит к: Корбар = { ном: "Алӣ", синну: 30 };

номфазо Асбоб { содир собит ном = "асбоб"; }
номфазо Асбоб { содир функсия салом(): сатр { бозгашт "салом, " + ном; } }

синф Нуқта { конструктор(ҷамъиятӣ х: рақам) {} }
номфазо Нуқта { содир собит сифр = нав Нуқта(0); }

шумориш Ранг { Сурх, Сабз }
шумориш Ранг { Кабуд = 5 }
чоп.сабт(Асбоб.салом(), Нуқта.сифр.х, Ранг.Кабуд);   // салом, асбоб 0 5
```

---

## Type Operators

| TypeScript                            | SomonScript                                    |
| ------------------------------------- | ---------------------------------------------- |
| `A \| B`, `A & B`                     | same                                           |
| `\| A \| B`, `& A & B` (leading)      | same, also across lines                        |
| `keyof T`                             | `калидҳои Т`                                   |
| `typeof x` (in a type)                | `навъи х`                                      |
| `T["k"]`, `T[K]`                      | same                                           |
| `T extends U ? X : Y`                 | `Т мерос У ? Х : Я`                            |
| `infer U`                             | `инфер У`                                      |
| `{ [K in keyof T]?: T[K] }`           | `{ [К дар калидҳои Т]?: Т[К] }`                |
| `-readonly`, `+?`, `-?`               | `-танҳохонӣ`, `+?`, `-?`                       |
| `[K in keyof T as N]`                 | `[К дар калидҳои Т чун Н]`                     |
| `` `pre_${T}` ``                      | same                                           |
| `unique symbol`                       | `беназир рамз`                                 |
| `readonly T[]`, `readonly [A, B]`     | `танҳохонӣ Т[]`, `танҳохонӣ [А, Б]`            |
| `x is T`                              | `х аст Т` (`is` also works)                    |
| `this is T`                           | `ин аст Т`                                     |
| `asserts x`, `asserts x is T`         | `тасдиқ х`, `тасдиқ х аст Т` (`asserts` works) |
| `[A, B?]`, `[A, ...B[]]`, `[x: A]`    | same                                           |
| `asserts this`, `asserts this is T`   | `тасдиқ ин`, `тасдиқ ин аст Т`                 |
| `{ get x(): T; set x(v: T); }`        | same (accessor signatures)                     |
| `{ (x: A): B }`, `{ new (x: A): B }`  | same (call and construct signatures)           |
| `{ [k]: T }` with `k: unique symbol`  | same (computed member names)                   |
| `new (a: A) => T`                     | `нав (а: А) => Т`                              |
| `abstract new () => T`                | `мавҳум нав () => Т`                           |
| `<T>(x: T) => T`, `new <T>() => T`    | `<Т>(х: Т) => Т`, `нав <Т>() => Т`             |
| `infer U extends string`              | `инфер У мерос сатр`                           |
| `typeof f<number>`                    | `навъи ф<рақам>`                               |
| `import("./m").T`, `typeof import(…)` | `ворид("./м").Т`, `навъи ворид("./м")`         |
| `-1`, `1n` (literal types)            | same                                           |
| `this` (type)                         | `ин`                                           |
| `<T extends U = D>`                   | `<Т мерос У = Д>` (`extends` also works)       |

```som
навъ Самт =
    | "чап"
    | "рост";

интерфейс Формат {
    (қимат: рақам): сатр;          // call signature: a Формат can be called
    пешванд: сатр;
}
интерфейс Созанда {
    нав (ном: сатр): { ном: сатр }; // construct signature: `нав с("…")`
}

навъ Нуқта = [х: рақам, у?: рақам];        // named tuple members
навъ Ҳамон = <Т>(х: Т) => Т;               // generic function type
навъ Аввал<Т> = Т мерос [инфер А мерос сатр, ...ҳар[]] ? А : абадан;

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

- `import.meta` (`ворид.meta`) outside ES module output: see
  [Type Checking and Module Output](15-type-checking.md).
- `export as namespace N;`: it only appears in declaration (`.d.ts`) files.
- `emitDecoratorMetadata`, and decorators on overload signatures or in `эълон`
  declarations (TypeScript rejects those too).

---

**Back to**: [Guide index](README.md)
