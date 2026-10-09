# Developer Tools

**`somon fmt`, `somon repl` and `somon migrate`**

---

## Formatter: `somon fmt`

```bash
somon fmt src/                  # format every .som file under src/ in place
somon fmt --check src/ test.som # report unformatted files, exit code 1 (CI)
somon fmt --stdout main.som     # print the formatted code, write nothing
somon fmt --indent 2 main.som   # two spaces per level
```

| Option          | Meaning                                                    |
| --------------- | ---------------------------------------------------------- |
| `--write`       | Write the formatted code back to the files (the default)   |
| `--check`       | Only list files that are not formatted; exit code 1 if any |
| `--stdout`      | Print the formatted code instead of writing it             |
| `--indent <n>`  | Spaces per indentation level, 1–16                         |
| directory input | Every `.som` file below it (not `node_modules`, `dist`)    |

The indentation width can also be set in `somon.config.json`; `--indent` wins:

```json
{ "fmt": { "indent": 2 } }
```

The Tajik name of the command is `формат` (`somon --lang tj формат …`).

### The canonical style

The formatter keeps your line breaks (like `gofmt`) and normalizes everything
inside and around them:

- indentation by nesting, 4 spaces per level; `ҳолат`/`пешфарз` one level inside
  `интихоб`, their statements one more; a line that continues the statement
  above (a chained `.метод()`, an operator at the end of the line, the body of
  `агар (…)` without braces) one level more;
- `{` on the line of its statement; `вагарна`, `гирифтан`, `ниҳоят` and the `то`
  of `кун { … } то (…)` right after the `}`;
- one space around binary operators, `=`, `=>` and `? :`, after commas, `;` and
  keywords (`агар (`, `барои (`, `функсия (`); none inside `( )` and `[ ]`, one
  inside `{ … }` on one line, none in `{}`; calls, indexes, type arguments and
  tagged templates attach to the name before them (`ф(х)`, `а[0]`,
  `Map<сатр, рақам>`, ``тег`…` ``);
- every statement ends with `;` (inserted where the parser accepted a line break
  instead);
- at most one blank line in a row, none right after `{` or before `}`; the file
  ends with one newline; trailing spaces and tabs are gone;
- line endings follow the file's first line break: when it is `\r\n` (as Git
  checks files out on Windows) every line ends with `\r\n`, otherwise with `\n`;
- every comment stays where it is; JSDoc comments (`/** … */`) are re-indented,
  and trailing `//` comments of consecutive lines that were aligned stay
  aligned.

Strings and template literals are never touched.

```som
// Before: valid, but hard to read
функсия калонтарин(рақамҳо:рақам[]):рақам
{
  тағ натиҷа=рақамҳо[0]
  барои(собит р аз рақамҳо){агар(р>натиҷа){натиҷа=р}}
  бозгашт натиҷа
}
```

```som
// After `somon fmt`
функсия калонтарин(рақамҳо: рақам[]): рақам {
    тағ натиҷа = рақамҳо[0];
    барои (собит р аз рақамҳо) { агар (р > натиҷа) { натиҷа = р; } }
    бозгашт натиҷа;
}
```

### Safety

The formatter never changes what a program means. It parses the result again and
compares the syntax tree (positions aside) and the list of comments with the
input; if anything differs it refuses and leaves the file alone. Files that do
not parse are reported and left alone too. Formatting twice gives the same
result as formatting once.

From code:

```ts
import { format, FormatError } from '@lindentech/somon-script';

const pretty = format(source, { indent: 4 }); // throws FormatError
```

`FormatError.kind` is `'syntax'` (the input does not parse) or `'unsafe'` (the
result would differ).

---

## Interactive session: `somon repl`

```text
$ somon repl
SomonScript 0.4.0. Type .help (.ёрӣ) for help, .exit (.баромад) to quit.
сомон> тағ х = 20
сомон> функсия дучанд(а: рақам) {
...      бозгашт а * 2;
...    }
сомон> дучанд(х) + 2
42
сомон> собит ҷавоб = интизор Ваъда.resolve("салом")
сомон> ҷавоб.калон()
'САЛОМ'
```

- Every input is compiled and run in one context: variables (`тағ`, `собит`),
  functions and classes stay visible in later inputs, and a name may be declared
  again.
- An input that ends with an expression prints its value (`util.inspect`); a
  call that returns nothing (`чоп.сабт(…)`) prints only what it logs.
- `интизор` works at the top level.
- An input continues on the next line (prompt `...`) while a bracket, block,
  template literal or block comment is open, or the statement is cut off
  (`тағ х =`).
- Arrow keys edit the line and walk the history, which is kept in
  `~/.somon_repl_history`. `SOMON_REPL_HISTORY=/path` moves it,
  `SOMON_REPL_HISTORY=` (empty) turns it off.
- Ctrl+C clears the current input; pressed again on an empty line it exits, as
  does Ctrl+D.

| Command             | Meaning                                          |
| ------------------- | ------------------------------------------------ |
| `.ёрӣ`, `.help`     | Show the commands                                |
| `.баромад`, `.exit` | Leave the session                                |
| `.пок`, `.clear`    | Forget all declarations and the current input    |
| `.js`               | Show the JavaScript compiled from the last input |

The Tajik name of the command is `интерактив`. Type checking is off in the
session, as in `compile(…, { typeCheck: false })`.

---

## TypeScript to SomonScript: `somon migrate`

```bash
somon migrate app.ts                # writes app.som next to it
somon migrate app.ts -o src/app.som
somon migrate src/ -o som/          # every .ts file (not .d.ts), same layout
somon migrate app.ts --stdout       # print the result
```

Warnings go to stderr as `file:line:column: warning: …`. The Tajik name of the
command is `интиқол`.

```ts
// TypeScript
interface Point {
  x: number;
  y: number;
}

export function farthest(points: Point[]): Point | undefined {
  let best: Point | undefined;
  for (const p of points) {
    if (!best || Math.hypot(p.x, p.y) > Math.hypot(best.x, best.y)) best = p;
  }
  console.log(`checked ${points.length} points`);
  return best;
}
```

```som
// SomonScript from `somon migrate`
интерфейс Point {
    x: рақам;
    y: рақам;
}

содир функсия farthest(points: Point[]): Point | беқимат {
    тағ best: Point | беқимат;
    барои (собит p аз points) {
        агар (!best || Риёзӣ.гипотенуза(p.x, p.y) > Риёзӣ.гипотенуза(best.x, best.y)) best = p;
    }
    чоп.сабт(`checked ${points.дарозӣ} points`);
    бозгашт best;
}
```

### What is translated

- Every keyword and type keyword to its Tajik form (see
  [Keywords](02-keywords.md), [Types](03-types.md) and
  [Operators](14-operators.md)): `let` → `тағ`, `const` → `собит`, `in` → `дар`,
  `typeof` → `навъи`, `keyof` → `калидҳои`, `x as T` → `x чун T`, `as const` →
  `чун собит`, `satisfies` → `бармесоё`, `number` → `рақам`, …
- Global objects and types: `console.x` → `чоп.x`, `Math` → `Риёзӣ`, `Object` →
  `объект`, `Array` → `рӯйхат`, `String` → `сатр`, `Promise` → `Ваъда`, `Error`
  → `Хато`, `undefined` → `беқимат`, `Partial<T>` → `қисмӣ<T>`, `Record<K, V>` →
  `сабт_навъ<K, V>` and the other utility types.
- Members of built-in types, when the TypeScript checker sees that the member
  belongs to `Array`, `String`, `Map`, `Set`, `Math`, `Object` or `console`:
  `xs.push(x)` → `xs.илова(x)`, `s.toUpperCase()` → `s.калон()`, `m.get(k)` →
  `m.бозгирифтан(k)`. Members of your own classes and objects keep their names.
  Every Tajik member name used is one the compiler translates back, so the
  program compiles to the same JavaScript.
- Your own names stay as they are, except names that are SomonScript keywords or
  built-ins (`агар`, `рӯйхат`, …): they get a `_` suffix and a warning.

Comments, blank lines and the order of everything stay as they were; the result
is then formatted with `somon fmt`.

### Newer TypeScript syntax

TypeScript 5 constructs get their SomonScript form (see the Classes, Decorators
and Declarations sections of [Operators](14-operators.md)):

| TypeScript                                  | SomonScript                                |
| ------------------------------------------- | ------------------------------------------ |
| `declare const x: T`, `declare module "m"`  | `эълон собит x: T`, `эълон модул "m"`      |
| `declare global { … }`                      | `эълон глобалӣ { … }`                      |
| `override m()`, `accessor x = 1`            | `бознавис m()`, `дастрасӣ x = 1`           |
| `using r = …`, `await using r = …`          | `истифода r = …`, `интизор истифода r = …` |
| `@logged m() {}`                            | `@logged m() {}`                           |
| `import type { T }`, `export type { T }`    | `ворид навъ { T }`, `содир навъ { T }`     |
| `import { type T, f }`                      | `ворид { навъ T, f }`                      |
| `function f<const T>(this: K)`              | `функсия f<собит T>(ин: K)`                |
| `interface I<in T, out U>`                  | `интерфейс I<дар T, берун U>`              |
| `import x = require("m")`, `import y = N.a` | `ворид x = require("m")`, `ворид y = N.a`  |
| `export = x`                                | `содир = x`                                |
| overload signatures, class index signatures | kept                                       |

Which of these the compiler understands is found out by compiling small probes,
so the same tool also serves an older compiler: there it leaves type-only
constructs out (they have no runtime effect), writes `собит x = require("m")`
and `module.exports = x`, and warns about each.

### What gets a warning

| TypeScript                                      | SomonScript                               |
| ----------------------------------------------- | ----------------------------------------- |
| `var`                                           | `тағ` (check code that needs `var`)       |
| call and construct signatures in interfaces     | left out (no runtime effect)              |
| `f<{ a: number }>(x)`, `f<any>(x)`, `o.m<T>(x)` | `f(x)`, `o.m(x)`: type arguments left out |
| `import("m")`, `import.meta`, `with`            | kept as written                           |
| `export * as ns`, anonymous default exports     | kept as written                           |

`do x++; while (c)` quietly becomes `кун { x++; } то (c)`, a catch clause type
(`catch (e: unknown)`) is dropped, and the type `bigint` keeps its English name.

The tool compiles its result: when that fails, the last warning says so.

Every construct has been checked: a corpus of TypeScript programs (every
statement, operator and type construct, and LeetCode solutions) is migrated,
compiled and run, and must print exactly what the TypeScript program prints
(`tests/migrate-differential.test.ts`).

From code:

```ts
import { migrate } from '@lindentech/somon-script';

const { code, warnings } = migrate(typeScriptSource);
for (const w of warnings) console.warn(`${w.line}:${w.column} ${w.message}`);
```

`migrate` throws `MigrateError` (with `diagnostics`) when the TypeScript does
not parse. Options: `typeInfo: false` (skip the checker; only `console`, `Math`,
`Object`, `Array` and `String` members are translated), `format: false` (keep
the layout of the input), `indent`.

---

**Back to**: [Guide index](README.md)
