# Type Checking and Module Output

**Two type checkers, `somon check`, declaration files and ES module output**

---

## The Two Checkers

| Checker      | Option                 | What it checks                                                                                                                                                                              |
| ------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `somon`      | default                | SomonScript's own checker: fast, works on one file, no setup                                                                                                                                |
| `typescript` | `--checker typescript` | The real TypeScript compiler (6.0): TypeScript's full semantics, imported `.som` modules, `.d.ts` typings from `node_modules` and `@types`, the standard library of the target (`--target`) |

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

| SomonScript                                         | TypeScript                                              |
| --------------------------------------------------- | ------------------------------------------------------- |
| `эълон собит/функсия/синф/шумориш/номфазо …`        | `declare const/function/class/enum/namespace …`         |
| `эълон модул "м" { … }`, `эълон глобалӣ { … }`      | `declare module "м" { … }`, `declare global { … }`      |
| overload signatures, `мавҳум` and `эълон` members   | the same signatures, `abstract`, `declare`              |
| `[калид: сатр]: Т;` in a class, `м?()`, `бознавис`  | index signatures, optional methods, `override`          |
| `дастрасӣ`, `истифода`, `интизор истифода`          | `accessor`, `using`, `await using`                      |
| decorators (`@д`), `ин` parameters                  | decorators, `this` parameters                           |
| `<собит Т>`, `<дар берун Т>`                        | `<const T>`, `<in out T>`                               |
| `ворид навъ`, `содир навъ`, `{ навъ Т }`            | `import type`, `export type`, `{ type T }`              |
| `ворид х = require("./м");`, `содир = х;`           | `import х = require("./м.js");`, `export = х;`          |
| `ворид мавқуф * чун Н аз "./м";`, `ворид.мавқуф(…)` | `import defer * as Н from "./м.js";`, `import.defer(…)` |
| `содир { х чун "а-б" };`, `ворид { "а-б" чун х }`   | `export { х as "а-б" };`, `import { "а-б" as х }`       |

- The program is checked with TypeScript's `module: "preserve"`, which allows
  `import … = require()` and `export =` next to ES module syntax (and
  `import defer`).
- Every package of `node_modules/@types` is seen (`types: ["*"]`): TypeScript 6
  includes none unless asked, TypeScript 5 included them all. So Node.js's
  `require`, `process` and `console` are known, and so are the globals of other
  `@types` packages; a package's own typings come with its import.
- A side-effect import of a module that does not exist (`ворид "./нест";`) is no
  type error, as before TypeScript 6 (which reports it by default): `somon run`
  and `somon bundle` report it when they load the program.
- Every option whose default TypeScript 6 changed is set: `strict` (now on by
  default) follows `--strict`, the target and its libs follow `--target`, and
  modules are checked as above. Code is strict mode code in any case: every
  `.som` file is a module.
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
translation) and Tajik (the most common diagnostics, those of TypeScript 5.5 to
6.0 among them; the others stay in English). The command line uses its interface
language (`--lang tj`, `--lang ru`); elsewhere set `locale`:

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
target. TypeScript 6 has a script target and a lib for every edition: es2023,
es2024 (`Object.groupBy`, `Promise.withResolvers`) and es2025 (iterator helpers,
`Set` methods, `Promise.try`, `RegExp.escape`) are checked as themselves.

`[1, 2].findLast(…)` is an error with the default target (`es2023` added it) and
fine with `--target esnext` or `--lib es2023,dom`. Packages bring their typings:
a package's `types`, `@types/<package>` and `.ts` files are all used.

---

## TypeScript 5.5 to 6.0 in the Checkers

The TypeScript checker has everything TypeScript added since 5.5. The
SomonScript checker has what is cheap to have exactly:

| TypeScript                                                           | SomonScript checker       |
| -------------------------------------------------------------------- | ------------------------- |
| 5.6: `0 ?? 4`, `холӣ ?? 1`, `агар (/а/)`, `то ("")` are errors       | yes, `CONSTANT_CONDITION` |
| 5.5: inferred type predicates (`х => х !== холӣ` narrows)            | `--checker typescript`    |
| 5.5: narrowing `о[к]` when `о` and `к` do not change                 | `--checker typescript`    |
| 5.5: regular expressions checked against their groups and target     | `--checker typescript`¹   |
| 5.6: iterator helpers (`.map` on iterators), `BuiltinIteratorReturn` | `--checker typescript`    |
| 5.7: a variable never assigned, read in a closure                    | `--checker typescript`    |
| 5.8: each branch of a returned `?:` against the return type          | `--checker typescript`    |
| 6.0: functions without `ин` are not context-sensitive in inference   | `--checker typescript`    |

¹ The lexer already rejects a regular expression JavaScript rejects.

The conditions of the first row are decided by their syntax alone: the left side
of `??` that is never nullish (a literal, an object, an arithmetic result) or
always is (`холӣ`, `беқимат`), and a condition (`агар`, `то`, `барои`, `?:`,
`!`, `&&`, `||`) that is always truthy (an array, object, function, regular
expression, a number other than 0 and 1, a non-empty string) or always falsy
(`""`, `холӣ`, `беқимат`). `дуруст`, `нодуруст`, `0` and `1` stay allowed:
`то (дуруст)`.

```som
функсия ҷустан(): рақам | холӣ {
    бозгашт холӣ;
}
чоп.сабт(ҷустан() ?? 0);      // fine: a call may be холӣ
// чоп.сабт(0 ?? 4);         // CONSTANT_CONDITION (TS2869): 0 is never nullish
```

`--erasableSyntaxOnly` (5.8) is for TypeScript that runs by stripping its types;
SomonScript is always compiled, and `шумориш`, `номфазо` and parameter
properties are part of the language.

## TypeScript 6, Not 7

SomonScript uses TypeScript 6.0 (`typescript` `~6.0.3`): the newest release with
TypeScript's JavaScript compiler API. TypeScript 7 (7.0 on npm) is the native
compiler written in Go; its package exports its version and an experimental
client that talks to the Go process, without `ts.createProgram`,
`ts.transpileModule` or transformers, and it has no es5 target. SomonScript uses
the API in three places:

- the TypeScript checker: `ts.createProgram` over an in-memory host that serves
  each `.som` file as the TypeScript the emitter prints, and maps diagnostics
  back, in English, Russian and Tajik;
- lowering for older targets: `ts.transpileModule` with transformers of its own
  (es5 subclasses of `Хато`, patterns in for-in heads, readable strings);
- `somon migrate`: TypeScript's parser and checker on the input.

Moving to TypeScript 7 would need the checker rebuilt on the client (a project
over a virtual file system, diagnostics over the wire, and the message
translations without `setLocalizedDiagnosticMessages`), another tool to lower
code (the API has no emit and no transformers; es5 would need one anyway), and
`migrate` rewritten against the client's syntax tree and checker. Until then the
version is pinned to 6.0.

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
