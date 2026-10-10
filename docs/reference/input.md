# Reading input: `хондан()` and `хонданиРақам()`

A program reads what the learner types with two functions. They need no import,
and they wait for the input before the program goes on: no `ҳамзамон` or
`интизор` is needed.

| Function               | Returns | What it does                                     |
| ---------------------- | ------- | ------------------------------------------------ |
| `хондан(савол?)`       | `сатр`  | reads the next line, without its line break      |
| `хонданиРақам(савол?)` | `рақам` | reads the next line and returns the number in it |

`савол` is printed before the function waits, without a line break after it.

```som
// examples/input/sum.som
тағ а = хонданиРақам("Рақами якум: ");
тағ б = хонданиРақам("Рақами дуюм: ");
чоп("Ҷамъ:", а + б);
```

```text
$ somon run examples/input/sum.som
Рақами якум: 2
Рақами дуюм: 3
Ҷамъ: 5
```

## Where the input comes from

- **The keyboard**: `somon run sum.som`, then type each line and press Enter.
- **A file**: `somon run sum.som < sum.txt` reads the lines of `sum.txt` in
  order (Linux, macOS and Windows `cmd`). In Windows PowerShell, which has no
  `<`, write `Get-Content sum.txt | somon run sum.som`.
- **Another program**: `printf '2\n3\n' | somon run sum.som`.

Lines may end with `\n` or `\r\n`, and the last line needs no line break. When
the input comes from a file, the prompts are printed one after another on one
line (`Рақами якум: Рақами дуюм: Ҷамъ: 5`): what was read is not printed.

The functions work in programs started with `somon run` (and in the playground,
which gives them the lines of its input field). JavaScript compiled with
`somon compile` and started with `node` has no input: a call ends the program
with an error saying where input can be read. A program that declares a
function, variable or parameter named `хондан` or `хонданиРақам` uses its own.

## Numbers

`хонданиРақам()` accepts a number as a learner writes it: digits with an
optional sign, a decimal point or a decimal comma, and an exponent (`42`, `-3`,
`2.5`, `2,5`, `1e3`). Spaces around the number do not matter. Anything else is
not a number: a word (`се`), an empty line, `1 000`, `0x10`.

When something else comes:

- **A person types the input** (standard input is a terminal): the function says
  so and asks again, until a number comes.

  ```text
  Рақами якум: се
  `се` рақам нест. Боз як бор рақам нависед:
  Рақами якум: 3
  ```

- **The input comes from a file or another program**: nobody can correct it, so
  the program ends with an error, exit code 1:

  ```text
  Хатои иҷро дар sum.som, сатри 9:
    `се` рақам нест: `хонданиРақам()` рақам интизор буд.
      9 | тағ б = хонданиРақам("Рақами дуюм: ");
        |         ^^^^^^^^^^^^
    Маслиҳат: Дар ин сатри вуруд рақам нависед, масалан `42` ё `2,5`.
  ```

## The end of the input

The input ends with the end of the file, or when the learner presses Ctrl+D
(Linux, macOS) or Ctrl+Z and then Enter (Windows). After the last line, both
functions end the program with an error, exit code 1:

```text
Хатои иҷро дар sum.som, сатри 9:
  Вуруд тамом шуд: `хонданиРақам()` боз як сатр интизор буд.
    9 | тағ б = хонданиРақам("Рақами дуюм: ");
      |         ^^^^^^^^^^^^
  Маслиҳат: Ба барнома ҳамон қадар сатри вуруд диҳед, ки он мехонад.
```

A program that does not know how many lines come usually reads their number
first:

```som
тағ шумора = хонданиРақам();
тағ ҷамъ = 0;
барои (тағ и = 0; и < шумора; и++) {
  ҷамъ += хонданиРақам();
}
чоп("Ҷамъ:", ҷамъ);
```

A program that reads to the end of the input catches the error:

```som
тағ ҷамъ = 0;
кӯшиш {
  то (дуруст) {
    ҷамъ += хонданиРақам();
  }
} гирифтан (хато) {
  // Вуруд тамом шуд
}
чоп("Ҷамъ:", ҷамъ);
```

## Types

The type checker knows that `хондан()` returns a `сатр` and `хонданиРақам()` a
`рақам`:

```som
тағ х: рақам = хондан();        // TYPE_NOT_ASSIGNABLE: use хонданиРақам()
тағ н: рақам = хонданиРақам();  // ok
```

## Messages

The errors of input are shown like the other errors of a running program (see
[Diagnostics in the learner's language](diagnostics.md)): in Tajik or Russian
with `--lang tj` or `--lang ru`; in English, `somon run` shows the error of
Node.js, as for other errors.

| Code                         | Тоҷикӣ                                                     |
| ---------------------------- | ---------------------------------------------------------- |
| `RUNTIME_INPUT_ENDED`        | Вуруд тамом шуд: `хонданиРақам()` боз як сатр интизор буд. |
| `RUNTIME_INPUT_NOT_A_NUMBER` | `се` рақам нест: `хонданиРақам()` рақам интизор буд.       |
| `INPUT_ASK_AGAIN`            | `се` рақам нест. Боз як бор рақам нависед:                 |

The Russian and English texts are in [the glossary](../glossary.tj.md).
