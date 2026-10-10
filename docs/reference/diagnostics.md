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

The type checker reports two mistakes beginners make that JavaScript accepts
until the program runs, or at all:

- `CONST_ASSIGNMENT` (error): a new value for a `собит` (`собит х = 1; х = 2;`).
- `ASSIGNMENT_IN_CONDITION` (warning): `=` in a condition, where `===` or `==`
  was meant (`агар (х = 1)`).
