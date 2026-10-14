# Diagnostics in the learner's language

The compiler can report its errors and warnings in Tajik, Russian or English,
written for someone who is learning to program: what is wrong, on which line,
the line of code with a caret under the place, and, where the compiler can tell,
a hint.

```text
Хато дар барнома.som, сатри 3:
  Қавси пӯшандаи `}` намерасад. Қавси `{` дар сатри 2 кушода шудааст.
    2 | агар (а > 0) {
      |              ^
    3 |   чоп(а);
      |          ^
Барнома компайл нашуд: 1 хато.
```

The [learning mode](learning-mode.md) adds warnings about mistakes that are
valid JavaScript (`хондан() + 1`, `"5" * 2`, unused variables).

## In the command line

`somon run`, `somon compile` and `somon bundle` report this way when the
language of the CLI is Tajik or Russian: `--lang tj`, `--lang ru`,
`SOMON_LANG=tj`, a Tajik or Russian `LANG` (`tg_TJ.UTF-8`, `ru_RU.UTF-8`), or
`"locale": "tj"` in `compilerOptions` of `somon.config.json`. File names are
shown relative to the current directory. In English the CLI keeps the messages
it always printed. `somon check` keeps its format in every language.

A warning printed before `somon run` starts the program is one line:

```text
Огоҳӣ дар барнома.som, сатри 2: Дар навъи `рақам` хосияти `дарозӣ` нест.
```

## Errors of the running program

With a Tajik or Russian language, an error that `somon run` meets while the
program runs and nothing catches is explained the same way: what happened, the
line of the `.som` file with a caret, and a hint. Neither the stack of Node.js
nor the generated JavaScript is shown; `somon run --стек` (or `--stack`) prints
the full stack after the message. The exit code stays 1.

```text
Хатои иҷро дар барнома.som, сатри 2:
  Хосияти `дарозӣ`-ро хондан мумкин нест: қимат `беқимат` аст.
    2 | тағ х = р[10].дарозӣ;
      |               ^^^^^^
  Маслиҳат: Шояд дар рӯйхат унсуре бо ин индекс нест: индексҳо аз 0 то `дарозӣ - 1` мебошанд.
```

The engine's messages about reading a member of `беқимат`/`холӣ`, a name that is
not defined or used before its declaration, calling what is no function, `нав`
of what is no class, `барои … аз` over what is no list, endless recursion and an
invalid length of a list are explained, with the program's Tajik names
(`дарозӣ`, not `length`). An error the program throws itself
(`партофтан нав Хато("…")`) keeps its message. The place in the `.som` file
comes from the source map `somon run` writes for the program. In English the
error of Node.js is printed as before.

## In the API

```ts
import { compile } from '@lindentech/somon-script';

const result = compile(source, { language: 'tj' });
result.errors; // texts as above, without a file name
result.diagnostics; // the same as data
```

Each diagnostic has a stable `code`, its `severity`, the `message` and `hint` in
the language asked for, and its `line`, `column` (1-based), `length` (how many
characters the caret covers) and `related` place (where a bracket was opened).
Errors come before warnings. `language` also sets the language of the TypeScript
checker (`locale`). Without `language`, `errors` and `warnings` are the
compiler's English messages, unchanged, and there is no `diagnostics`.

`formatDiagnostic(diagnostic, { language, source, file })` and
`formatFailure(errorCount, language)` print diagnostics as the CLI does. The
module system reports this way for a Russian or Tajik `locale`: each
`CompilationError` and `CompilationWarning` has a `diagnostic`, and a failed
`bundle()` throws a `BundleError` with them.

## Codes

The codes and every message in the three languages are listed in
[docs/glossary.tj.md](../glossary.tj.md). Codes starting with `PARSE_` and
`LEX_` are about code that cannot be read, `CODEGEN_` about code that cannot be
turned into JavaScript, `MODULE_` and `CIRCULAR_DEPENDENCY` about modules; the
others come from the type checker (`TYPE_NOT_ASSIGNABLE`,
`UNDEFINED_IDENTIFIER`, `CONST_ASSIGNMENT`, …). A code of the TypeScript checker
is TypeScript's (`TS2322`).

The type checker reports three mistakes beginners make that JavaScript accepts
until the program runs, or at all:

- `CONST_ASSIGNMENT` (error): a new value for a `собит` (`собит х = 1; х = 2;`).
- `ASSIGNMENT_IN_CONDITION` (warning): `=` in a condition, where `===` or `==`
  was meant (`агар (х = 1)`).
- `TYPE_NOT_FOUND` (warning; an error with `--strict`): a type name that is
  neither built in nor declared, with the closest name as a hint
  (`тағ а: мантики` — «Шояд `мантиқӣ`-ро дар назар доштед?»). Only names with
  Cyrillic letters are checked: a name in Latin letters may be any type of
  JavaScript's, TypeScript's or the browser's libraries.
