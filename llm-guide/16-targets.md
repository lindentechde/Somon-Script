# Targets

**Which JavaScript version the compiled code runs on, and how bundles reach
Node.js and browsers**

SomonScript compiles to JavaScript for every ECMAScript version from ES5 to
ESNext. The code generator writes modern JavaScript; for an older target the
compiler lowers what is newer than the target with TypeScript's own
transformers, and reports what no transformer can express.

---

## Choosing a Target

| Value               | Runs on                                        |
| ------------------- | ---------------------------------------------- |
| `es5`               | ES5 engines (Internet Explorer 11, old WebKit) |
| `es2015` … `es2019` | engines of that edition                        |
| `es2020` (default)  | Node.js 14+, current browsers                  |
| `es2021` … `es2024` | engines of that edition                        |
| `esnext`            | the newest engines: nothing is lowered         |

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

The default target, `es2020`, therefore lowers class fields, private members and
static blocks; a program without them is emitted exactly as generated.

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
  `WeakMap`, `Promise`, `Date`, typed arrays, …): that is a compile error, since
  an ES5 class calls its base as a function.

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
| modifiers `(?i:…)`                                      | esnext |
| top-level `интизор` / `барои интизор`                   | es2022 |

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
`Symbol.dispose` (`Symbol.asyncDispose` for `интизор истифода`) at run time.

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

- Names are TypeScript's: `es5` … `es2023`, `esnext`, `dom`, `dom.iterable`,
  `webworker`, `scripthost` and parts such as `es2015.promise` or
  `es2022.array`. Case does not matter; an unknown name is an error.
- Default: the target's ECMAScript lib and the DOM, as in TypeScript
  (`["es2020", "dom", "dom.iterable", "dom.asynciterable"]` for `es2020`).

---

## Class Fields: `useDefineForClassFields`

A field (`ном = "Алӣ";` or `ном: сатр;`) either is _defined_ on the new object
(JavaScript's semantics since ES2022) or _assigned_ in the constructor
(TypeScript's semantics before). The default follows TypeScript: defined from
`es2022` on, assigned below.

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
// false: 5 (the field is not redefined); true: undefined
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
- Programs that need lowering (48 of the 170 at `es2020`, those with class
  fields or private members): TypeScript adds about 5–10 ms each; `es5` adds
  about 5 ms per program on top of code generation.
- Programs without newer syntax are not rewritten at all.

---

**Next**: [README.md](README.md) — the guide's index
