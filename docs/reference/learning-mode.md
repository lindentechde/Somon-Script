# The learning mode

Some mistakes of beginners are valid JavaScript: the program runs, without an
error, and prints something unexpected. In the learning mode the compiler warns
about them, in the learner's language (see
[Diagnostics in the learner's language](diagnostics.md)). The program still
compiles and runs.

| Code                          | What                                                           | Example                       |
| ----------------------------- | -------------------------------------------------------------- | ----------------------------- |
| `LEARNER_STRING_ARITHMETIC`   | `-`, `*`, `/`, `%`, `**` with a `сатр`                         | `"5" * 2`, `хондан() - 1`     |
| `LEARNER_STRING_PLUS_NUMBER`  | a line read with `хондан()` added to a number                  | `хондан() + 1` is `"21"`      |
| `LEARNER_COMPARE_TYPES`       | `===` or `!==` between a `сатр` and a `рақам`, always the same | `хонданиРақам() === "5"`      |
| `LEARNER_UNUSED_VARIABLE`     | a variable that is declared and never used                     | `тағ а = 1;` and nothing else |
| `LEARNER_BUILTIN_MEMBER_NAME` | an own property named like a built-in member (see below)       | `{ дарозӣ: 5 }`               |

```text
Огоҳӣ дар барнома.som, сатри 2:
  Сатре, ки бо `хондан()` хонда шудааст, `сатр` аст: `+` онро бо рақам ҷамъ намекунад, балки мепайвандад (`"2" + 3` — `"23"`). Рақамҳоро бо `хонданиРақам()` хонед.
    2 | чоп(а + 1);
      |     ^
```

Joining text with a number on purpose (`"Ҷавоб: " + н`, `хат += н`) is no
mistake and gets no warning; neither does a variable whose name starts with `_`,
nor one that is exported.

## Turning it on

- **The playground:** «Реҷаи таълимӣ» (on by default).
- **`somon run`, `somon compile`, `somon bundle`:** `"режим": "таълимӣ"` at the
  top of `somon.config.json`:

  ```json
  {
    "режим": "таълимӣ"
  }
  ```

  `"режим": "оддӣ"` (ordinary), the default, leaves it off.

- **The API:** `compile(source, { learningMode: true })`, also in the compiler
  for browsers. The warnings come with SomonScript's type checker (not with
  `checker: 'typescript'`), whose types they use.

## Properties named like built-in members

The names of built-in members (`дарозӣ`, `илова`, `хато`, `вақт`, `маълумот`, …)
are JavaScript's names in the output, for every object: `о.дарозӣ` is
`о.length`, because the compiler does not know the type of `о`. An object's own
property of such a name is renamed the same way, so the program works, but:

- printing the object shows JavaScript's name: `{ дарозӣ: 5 }` prints as
  `{ length: 5 }`;
- `Object.keys(о)` gives `"length"`;
- data from outside, whose key is the Tajik word
  (`JSON.parse('{"дарозӣ": 7}')`), cannot be read with `.дарозӣ`, which reads
  `length`; read it with `о["дарозӣ"]`.

Keeping such names apart would need the type of every object when the code is
generated, which would change programs that work now. The learning mode warns
instead, at data properties of object literals and classes; methods of such
names (`баСатр()` for `toString`) are meant to be the built-in ones and get no
warning. Choose another name: `дарозии_қуттӣ`, `вақти_дарс`.
