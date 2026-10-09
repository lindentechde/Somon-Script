# Type Checking and Module Output

**Two type checkers, `somon check`, declaration files and ES module output**

---

## The Two Checkers

| Checker      | Option                 | What it checks                                                                                                                                                                        |
| ------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `somon`      | default                | SomonScript's own checker: fast, works on one file, no setup                                                                                                                          |
| `typescript` | `--checker typescript` | The real TypeScript compiler: TypeScript's full semantics, imported `.som` modules, `.d.ts` typings from `node_modules` and `@types`, the standard library of the target (`--target`) |

The TypeScript checker turns the program into TypeScript that keeps every type
(Tajik type names become TypeScript's: `рақам` → `number`, `қисмӣ` → `Partial`,
`Ваъда` → `Promise`, …), checks it with TypeScript, and reports each error at
its line and column in the `.som` file:

```som
функсия ҷамъ(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}
тағ натиҷа: сатр = ҷамъ(1, 2);
```

```text
Type error [TS2322] at line 4, column 5: Type 'рақам' is not assignable to type 'сатр'.
> тағ натиҷа: сатр = ҷамъ(1, 2);
```

Choose the checker:

| Where               | How                                                    |
| ------------------- | ------------------------------------------------------ |
| Command line        | `somon compile file.som --checker typescript`          |
| `somon.config.json` | `{ "compilerOptions": { "checker": "typescript" } }`   |
| API                 | `compile(source, { checker: 'typescript', filePath })` |

`filePath` is the path of the `.som` file: imports and `node_modules` typings
are resolved from it. The command line passes it for you. `run` and `bundle`
check every module of the program.

### What TypeScript sees

Everything SomonScript writes reaches TypeScript as written, including the
declarations that exist only for the checker:

| SomonScript                                        | TypeScript                                         |
| -------------------------------------------------- | -------------------------------------------------- |
| `эълон собит/функсия/синф/шумориш/номфазо …`       | `declare const/function/class/enum/namespace …`    |
| `эълон модул "м" { … }`, `эълон глобалӣ { … }`     | `declare module "м" { … }`, `declare global { … }` |
| overload signatures, `мавҳум` and `эълон` members  | the same signatures, `abstract`, `declare`         |
| `[калид: сатр]: Т;` in a class, `м?()`, `бознавис` | index signatures, optional methods, `override`     |
| `дастрасӣ`, `истифода`, `интизор истифода`         | `accessor`, `using`, `await using`                 |
| decorators (`@д`), `ин` parameters                 | decorators, `this` parameters                      |
| `<собит Т>`, `<дар берун Т>`                       | `<const T>`, `<in out T>`                          |
| `ворид навъ`, `содир навъ`, `{ навъ Т }`           | `import type`, `export type`, `{ type T }`         |
| `ворид х = require("./м");`, `содир = х;`          | `import х = require("./м.js");`, `export = х;`     |

- The program is checked with TypeScript's `module: "preserve"`, which allows
  `import … = require()` and `export =` next to ES module syntax.
- `эълон модул "м"` declares the module `м`: the checker gives it a declaration
  file of its own, since inside a module file it would only augment an existing
  module.
- Legacy decorators, which may also decorate parameters, need
  `--experimental-decorators`; otherwise decorators are checked as standard
  ones.

### Strict mode

Without `--strict`, TypeScript's default (non-strict) options apply and type
errors are reported while code is still emitted. `--strict` turns on
TypeScript's `strict` options (`noImplicitAny`, `strictNullChecks`,
`strictPropertyInitialization`, `useUnknownInCatchVariables`, …) and makes every
type error fatal, as with the SomonScript checker.

Things strict TypeScript checking asks for:

- **Parameter types.** `функсия ф(х)` is an error (`TS7006`); write
  `функсия ф(х: рақам)`.
- **`беджавоб`, not `холӣ`, for "returns nothing".** `холӣ` is the type of
  `null`: `функсия ф(): холӣ {}` must `бозгашт холӣ;`.
- **`Ваъда<Т>` for `ҳамзамон` functions:** `ҳамзамон функсия ф(): Ваъда<сатр>`.
- **Nullable results:** `Корбар | холӣ` when a function may `бозгашт холӣ`, and
  a check (`агар (к !== холӣ)`) before use.
- **Catch variables are `ношинос`:** `(хато чун Хато).message`, or
  `агар (хато instanceof Хато)`.
- **`муҳофизатшуда` for members used by subclasses**; `хосусӣ` members are
  visible only in their own class.

```som
синф Ҳайвон {
    муҳофизатшуда ном: сатр;
    конструктор(ном: сатр) {
        ин.ном = ном;
    }
}

синф Саг мерос Ҳайвон {
    овоз(): сатр {
        бозгашт ин.ном + " вав мекунад";
    }
}

ҳамзамон функсия хондан(роҳ: сатр): Ваъда<сатр | холӣ> {
    кӯшиш {
        бозгашт интизор Ваъда.resolve(роҳ);
    } гирифтан (хато) {
        чоп.хато((хато чун Хато).message);
        бозгашт холӣ;
    }
}
```

---

## Messages

TypeScript's type names appear in Tajik (`'number'` → `'рақам'`), and a member
written with its Tajik name is shown with both names:

```text
Type error [TS2339] at line 2, column 3: Property 'дорад' (includes) does not exist on type 'Map<сатр, рақам>'; use 'дорадКалид' (has) to test membership
> м.дорад("к");
```

Messages come in three languages: English (default), Russian (TypeScript's own
translation) and Tajik (the most common diagnostics; the others stay in
English). The command line uses its interface language (`--lang tj`,
`--lang ru`); elsewhere set `locale`:

| Where               | How                                         |
| ------------------- | ------------------------------------------- |
| Command line        | `somon check file.som --lang tj`            |
| `somon.config.json` | `{ "compilerOptions": { "locale": "tj" } }` |
| API                 | `compile(source, { locale: 'ru' })`         |

```text
Type error [TS2322] at line 1, column 5: Навъи 'сатр' ба навъи 'рақам' мувофиқ нест.
> тағ н: рақам = "н";
```

---

## `somon check`

`somon check <files…>` type-checks without writing any output. It uses the
TypeScript checker unless `--checker somon` (or the config's `checker`) says
otherwise, prints the errors of each file and exits with code 1 when there are
any.

```bash
somon check src/main.som src/math.som      # ✅ No type errors in 2 file(s)
somon check src/*.som --strict --lang tj    # Tajik messages, strict mode
somon check src/main.som --target esnext    # the newest standard library
```

All files are checked in one TypeScript program, so checking many at once is
fast (the 100 LeetCode solutions take a few seconds).

---

## Declaration Files

`--declaration` (config `declaration`, API `declaration: true`) also produces
TypeScript declarations: `somon compile math.som --declaration` writes `math.js`
and `math.d.ts`, and `compile()` returns the text in
`CompileResult.declaration`. The file is named as TypeScript looks for it next
to the output: `-o math.mjs` writes `math.d.mts`, `-o math.cjs` `math.d.cts`.

```som
содир функсия ҷамъ(а: рақам, б: рақам): рақам {
    бозгашт а + б;
}

содир интерфейс Корбар {
    ном: сатр;
    синну?: рақам;
}
```

```ts
export declare function ҷамъ(а: number, б: number): number;
export interface Корбар {
  ном: string;
  синну?: number;
}
```

Member names are those of the JavaScript output (`илова` → `push`), so the
declarations describe the emitted JavaScript exactly.

---

## Standard Library and Typings

| Option                      | Default                                   | Effect                                   |
| --------------------------- | ----------------------------------------- | ---------------------------------------- |
| `--target`                  | `es2022`                                  | The ES edition of the standard library   |
| `--lib` (config `lib`)      | the target's libs and `esnext.disposable` | TypeScript lib names: `es2022`, `dom`, … |
| `useDefineForClassFields`   | TypeScript's default for the target       | Class field semantics                    |
| `--experimental-decorators` | off: standard decorators                  | Legacy decorators (parameter decorators) |

The target's libs are those of [Targets](16-targets.md): its ES lib, `dom`,
`dom.iterable` and `dom.asynciterable`. From es2015 the checker adds
`esnext.disposable` (`Symbol.dispose`), since `истифода` is lowered for every
target. The installed TypeScript (5.4) has no es2023/es2024 script target, so
both are checked as es2022 syntax, and no es2024 lib: es2024 uses es2023 plus
the esnext parts with ES2024's APIs (`Object.groupBy`, `Map.groupBy`,
`Promise.withResolvers`).

`[1, 2].findLast(…)` is an error with the default target (`es2023` added it) and
fine with `--target esnext` or `--lib es2023,dom`. Packages bring their typings:
a package's `types`, `@types/<package>` and `.ts` files are all used.

---

## ES Module Output

`--module esm` (config `module`, API `module: 'esm'`) emits `import`/`export`
instead of `require`/`module.exports`. The default is `commonjs`.

| SomonScript                   | `--module esm`                     |
| ----------------------------- | ---------------------------------- |
| `ворид { а } аз "./м";`       | `import { а } from "./м.js";`      |
| `ворид а, * чун Н аз "./м";`  | `import а, * as Н from "./м.js";`  |
| `ворид "./м";`                | `import "./м.js";`                 |
| `содир функсия ф() {}`        | `export function ф() {}`           |
| `содир пешфарз синф К {}`     | `export default class К {}`        |
| `содир { а чун б } аз "./м";` | `export { а as б } from "./м.js";` |
| `содир * чун Н аз "./м";`     | `export * as Н from "./м.js";`     |
| `ворид("./м")`                | `import("./м.js")`                 |
| `ворид.meta.url`              | `import.meta.url`                  |
| `ворид х = require("./м");`   | `import х from "./м.js";`          |
| `содир = х;`                  | `export default х;`                |

- Imports used only as types (`ворид { Корбар } аз "./м";` for an interface) are
  dropped; the module still runs (`import "./м.js";`). `ворид навъ` imports
  nothing at all.
- Exports of local interfaces and type aliases are dropped. A re-export names
  what another module exports, which ES modules check when they load: mark
  re-exported types with `навъ`, `содир навъ { Корбар } аз "./м";` or
  `содир { навъ Корбар, ҷамъ } аз "./м";`, and they are left out of the
  JavaScript.
- An export named like a built-in member is exported under its JavaScript name,
  as in CommonJS: `содир функсия илова() {}` → `export { илова as push };`.
- `ворид х = require("./м");` imports what a CommonJS module assigns to
  `module.exports`, which ES modules see as its default export; `содир = х;`
  makes `х` the default export.
- ES modules allow `интизор`, `барои интизор` and `интизор истифода` at the top
  level, and `ворид.meta` (`import.meta`). With `--module commonjs` both are
  errors (the API's `topLevelAwait` option allows top-level `интизор` for hosts
  that run the code in an async function, as the REPL does).
- `somon run --module esm` runs the ES modules (with their `node_modules`).
- `somon bundle` keeps CommonJS modules in the bundle's module table whatever
  `module` is; with `module: "esm"` the bundle itself is an ES module (the `esm`
  bundle format) unless `--format` or `bundle.format` says otherwise.

```som
ворид "./танзимот";
ворид { ҷамъ } аз "./math";
содир * чун Ёрирасон аз "./helpers";
```

```bash
somon compile main.som --module esm          # main.js with import/export
somon run main.som --module esm              # top-level интизор works
```

---

**Back to**: [Guide index](README.md)
