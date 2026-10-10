# Targets

**Which JavaScript version the compiled code runs on, and how bundles reach
Node.js and browsers**

SomonScript compiles to JavaScript for every ECMAScript version from ES5 to
ESNext. The code generator writes modern JavaScript; for an older target the
compiler lowers what is newer than the target with TypeScript's own
transformers, and reports what no transformer can express.

---

## Choosing a Target

| Value                        | Runs on                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| `es5`                        | ES5 engines (Internet Explorer 11, old WebKit)                |
| `es2015` … `es2021`          | engines of that edition                                       |
| `es2022` (default)           | Node.js 16.11+ (so every supported Node.js), current browsers |
| `es2023`, `es2024`, `es2025` | engines of that edition (Node.js 20 lacks parts of ES2024)    |
| `esnext`                     | the newest engines: nothing is lowered                        |

The default stays `es2022`: every Node.js SomonScript supports (20 and newer)
runs all of it. ES2025 adds regular expression modifiers, duplicate named groups
in alternatives, iterator helpers, `Set` methods, `Promise.try`, `RegExp.escape`
and `Float16Array`: Node.js 24 runs all of it, Node.js 22 has the iterator
helpers and `Set` methods only.

```bash
somon compile app.som --target es2015
somon run app.som --target es5
somon bundle main.som --target es2017 --format iife --global-name Барнома
```

```json
{
  "compilerOptions": {
    "target": "es2018",
    "lib": ["es2018", "dom"],
    "useDefineForClassFields": true
  }
}
```

From code: `compile(source, { target: 'es2015' })`. An unknown target is a
compile error that lists the valid ones.

---

## What Gets Lowered

The compiler looks at the generated JavaScript. When it only uses syntax the
target has, it is emitted as it is; otherwise TypeScript rewrites it for the
target. Helpers such as `__awaiter` or `__classPrivateFieldGet` are written into
the output: there is no `tslib` dependency at run time.

| Syntax                                                       | Since  | Below that target                                  |
| ------------------------------------------------------------ | ------ | -------------------------------------------------- |
| `тағ`/`собит`, arrows, classes, templates, destructuring     | es2015 | `var`, functions, prototypes, string concatenation |
| spread, `барои … аз` (for-of), generators (`функсия*`)       | es2015 | iteration protocol helpers (see es5 below)         |
| `**`, `**=`                                                  | es2016 | `Math.pow`                                         |
| `ҳамзамон`/`интизор` (async/await)                           | es2017 | generators + `__awaiter` (needs `Promise`)         |
| async generators, `барои интизор` (for await)                | es2018 | `__asyncGenerator`, `__asyncValues`                |
| object spread and rest `{ ...о }`                            | es2018 | `Object.assign` / `__assign`, `__rest`             |
| `гирифтан { }` without a binding                             | es2019 | a generated binding                                |
| line/paragraph separators in string literals                 | es2019 | `\u2028` / `\u2029` escapes                        |
| `?.`, `??`                                                   | es2020 | conditional expressions                            |
| `&&=`, `\|\|=`, `??=`, numeric separators `1_000`            | es2021 | plain assignments, `1000`                          |
| class fields, `#хосусӣ` members, `#х дар о`, static blocks   | es2022 | constructor code, `WeakMap`/`WeakSet`, functions   |
| decorators `@ном`, `дастрасӣ` (accessor), `истифода` (using) | never  | TypeScript's helpers, on every target              |
| `ворид мавқуф * чун Н`, `ворид.мавқуф(…)` (deferred imports) | never  | CommonJS: `require` on first use (see below)       |

The default target, `es2022`, has everything the code generator emits except
decorators, `дастрасӣ` and `истифода`, so the default output of any other
program is the generated code itself. `--target es2020` or older lowers class
fields, private members and static blocks too; a program without newer syntax is
still emitted exactly as generated.

Lowering changes syntax, not the mode the code runs in. TypeScript 6 writes
every file as strict mode code (it adds `"use strict"` to a script); the
compiler takes that line out again, so a script without imports or exports runs
in the same (sloppy) mode on every target, as it does without lowering.

```som
синф Ҳисоб {
    #баланс = 0;
    статикӣ шумора = 0;
    статикӣ { Ҳисоб.шумора = 1; }
    илова(маблағ: рақам): рақам {
        ин.#баланс += маблағ;
        бозгашт ин.#баланс;
    }
}
собит ҳ = нав Ҳисоб();
ҳ.илова(5);
чоп.сабт(ҳ.илова(10), Ҳисоб.шумора, 2 ** 10); // 15 1 1024 on every target
```

### es5

- Spread, `барои … аз`, array destructuring and `ҳосил*` follow the iteration
  protocol (TypeScript's `downlevelIteration`): `[...генератор()]`, spreading a
  `Map` or `Set` and destructuring strings work as in ES2015.
- `барои (собит [а, б] дар объект)` (a pattern in a for-in head) is rewritten so
  that the loop variable is destructured inside the loop.
- Subclasses of `Хато` (`Error`), its relatives and `Array` keep their
  prototype, so `instanceof` and their own methods work.
- Classes cannot extend built-ins that only work with `нав` (`Map`, `Set`,
  `WeakMap`, `Promise`, `Date`, typed arrays, `Iterator`, …): that is a compile
  error, since an ES5 class calls its base as a function.
- es5 relies on what TypeScript 6 deprecates and TypeScript 7 removes: the `es5`
  target and `downlevelIteration`. They still work in TypeScript 6 with
  `ignoreDeprecations: "6.0"`, which the compiler and the TypeScript checker
  pass for es5 only, so no deprecation error appears. A TypeScript without them
  (7) would need another lowering for es5, or es5 would go.

### Errors Instead of Lowering

Some syntax has no ES5…ES2019 equivalent. Using it with an older target is a
compile error naming the construct and the oldest target that has it:

| Construct                                               | Needs  |
| ------------------------------------------------------- | ------ |
| BigInt literals `10n` (as in TypeScript)                | es2020 |
| regular expression flags `u`, `y`                       | es2015 |
| flag `s`, named groups `(?<ном>…)`, lookbehind, `\p{…}` | es2018 |
| flag `d`                                                | es2022 |
| flag `v`                                                | es2024 |
| modifiers `(?i:…)`, one group name in alternatives      | es2025 |
| top-level `интизор` / `барои интизор`                   | es2022 |
| ES modules: names written as strings (`х чун "а-б"`)    | es2022 |
| ES modules: `ворид мавқуф`, `ворид.мавқуф(…)`           | esnext |

```text
Target error at line 3, column 1: BigInt literals are only available when targeting es2020 or later (target is es2015).
> чоп.сабт(2n ** 64n);
```

`ворид("./модул")` (dynamic import) and `import.meta` are module syntax and are
kept as they are, as TypeScript does. A `#!` line stays the first line, lowered
or not.

No JavaScript engine runs decorators, `дастрасӣ` fields or `истифода`
declarations yet, so they are lowered for every target, `esnext` included (which
is then lowered as the newest edition): standard decorators with `__esDecorate`,
or TypeScript's legacy ones with `__decorate`/`__param` when
`experimentalDecorators` is set (`--experimental-decorators`). `истифода` needs
`Symbol.dispose` (`Symbol.asyncDispose` for `интизор истифода`) at run time. The
newest edition is es2025.

No engine runs deferred imports (`ворид мавқуф * чун Н аз "./м";`, TypeScript
5.9 `import defer`) yet either. CommonJS output (the default, and every module
of a bundle) defers the `require` on every target: `Н` is a namespace that
requires the module when one of its members is first read; it needs `Proxy` and
`Reflect` at run time. ES module output keeps `import defer` and
`import.defer(…)` as TypeScript does, for runtimes and bundlers that have them,
so it needs `--target esnext`; Node.js 20 to 24 do not load it. See
[Operators](14-operators.md#declarations).

---

## Run-Time Library and `lib`

Lowering changes syntax only. Built-in objects and methods must exist where the
code runs: lowered `async` code needs `Promise`, `#хосусӣ` members need
`WeakMap`, for-of needs `Symbol.iterator`, and `рӯйхат.дорад()` needs
`Array.prototype.includes`. For old engines load polyfills (core-js, for
example) before the program.

`lib` lists the APIs the run time provides, with TypeScript's lib names. The
TypeScript checker (`checker: 'typescript'`) uses it to report APIs that do not
exist there.

```bash
somon compile app.som --target es5 --lib es2015,dom
```

- Names are TypeScript's: `es5` … `es2025`, `esnext`, `dom`, `dom.iterable`,
  `webworker`, `scripthost` and parts such as `es2015.promise` or
  `es2022.array`. Case does not matter; an unknown name is an error.
- Default: the target's ECMAScript lib and the DOM, as in TypeScript
  (`["es2022", "dom", "dom.iterable", "dom.asynciterable"]` for `es2022`).

---

## Class Fields: `useDefineForClassFields`

A field (`ном = "Алӣ";` or `ном: сатр;`) either is _defined_ on the new object
(JavaScript's semantics since ES2022) or _assigned_ in the constructor
(TypeScript's semantics before). The default follows TypeScript: defined from
`es2022` on (so with the default target), assigned below.

| `useDefineForClassFields` | Field with value                       | Field without value  |
| ------------------------- | -------------------------------------- | -------------------- |
| `true`                    | `Object.defineProperty` / native field | defined, `undefined` |
| `false`                   | `this.ном = …` in the constructor      | not created          |

The difference shows when a base class has a setter or sets the field itself:

```som
синф Асос {
    конструктор() { ин.омода(); }
    омода(): холӣ { }
}
синф Ворис мерос Асос {
    қимат: рақам;
    омода(): холӣ { ин.қимат = 5; }
}
// false (es2021 and older): 5, the field is not redefined; true (es2022+): undefined
чоп.сабт(нав Ворис().қимат);
```

Set it with `--use-define-for-class-fields` /
`--no-use-define-for-class-fields`, `compilerOptions.useDefineForClassFields` or
the `compile` option.

---

## Bundles

`somon bundle` writes the entry and every local module it imports into one file.
The whole bundle is lowered once for the target (helpers appear once, local
`.js` files are lowered too) and source maps still point at the `.som` files.

| `--format`           | Exposes the entry's exports           | Loads what is not bundled       |
| -------------------- | ------------------------------------- | ------------------------------- |
| `commonjs` (default) | `module.exports`                      | `require`                       |
| `esm`                | `export { … }` (and `export default`) | static `import`                 |
| `iife`               | `globalThis[globalName]`              | nothing: an error at build time |

```som
// китоб.som
содир функсия салом(ном: сатр): сатр {
    бозгашт `Салом, ${ном}!`;
}
содир пешфарз синф Ҳисобкунак {
    ҷамъ(а: рақам, б: рақам): рақам { бозгашт а + б; }
}
```

### Browsers

```bash
somon bundle китоб.som --format iife --global-name Китоб --target es2015 -o kitob.js
```

```html
<script src="kitob.js"></script>
<script>
  console.log(Китоб.салом('ҷаҳон'));
  console.log(new Китоб.default().ҷамъ(1, 2));
</script>
```

An IIFE bundle needs no `require` or `module`; `--global-name` may be a dotted
path (`app.kitob`) whose objects are created as needed. Without it the bundle
only runs its code. A `#!` line of the entry starts commonjs and esm bundles
(Node.js runs both with one) but not an IIFE bundle, which is a browser script.

### ES Modules

```bash
somon bundle китоб.som --format esm -o kitob.mjs
```

```js
import Ҳисобкунак, { салом } from './kitob.mjs';
```

Modules that are not bundled (`--externals`, packages from `node_modules`,
Node.js modules such as `fs`) become `import * as … from "…"` at the top of the
bundle.

### Configuration

```json
{
  "compilerOptions": { "target": "es2015" },
  "bundle": { "format": "iife", "globalName": "Китоб", "sourceMaps": true }
}
```

---

## Cost

Measured on the 170 programs in `examples/` and `examples/leetcode/` (Node 22):

- Checking the generated code against the target: about 0.4 ms per program, on
  every compile.
- At the default `es2022` none of them is rewritten. At `es2020` 48 of the 170
  (those with class fields or private members) are: TypeScript adds about 5–10
  ms each; `es5` adds about 5 ms per program on top of code generation.
- Programs without newer syntax are not rewritten at all.

---

**Next**: [README.md](README.md) — the guide's index
