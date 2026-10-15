# Lesson 1. Your first program

**In this lesson:** you will write your first program, run it, and use `чоп` to
show text and numbers on the screen.

## What is a program?

A program is a list of commands for the computer. The computer runs them one by
one, from top to bottom.

## The playground

We write and run programs in the **playground** (майдони озмоиш):
<https://lindentechde.github.io/Somon-Script/>. It opens in the browser, and you
do not need to install anything. You write the program on the left. On the right
are "Вуруд" ("input") and "Натиҷа" ("output"). The **▶ Иҷро** ("Run") button
runs the program. The page is in Tajik and Russian.

## The `чоп` command

```som
чоп("Салом, ҷаҳон!");
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YfQvtC_KCLQodCw0LvQvtC8LCDSt9Cw0rPQvtC9ISIpOwo)

- `чоп` ("print") shows what is inside the brackets in "Натиҷа".
- Text is written in quotes `"…"`. In programming, a piece of text is called a
  **string** (`сатр`).
- Every command ends with `;`.

## Several lines and numbers

```som
чоп("Ман барномасозиро меомӯзам.");
чоп("Ин барномаи аввали ман аст.");
чоп(2026);
чоп(2 + 3);
чоп("2 + 3");
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YfQvtC_KCLQnNCw0L0g0LHQsNGA0L3QvtC80LDRgdC-0LfQuNGA0L4g0LzQtdC-0LzTr9C30LDQvC4iKTsK0YfQvtC_KCLQmNC9INCx0LDRgNC90L7QvNCw0Lgg0LDQstCy0LDQu9C4INC80LDQvSDQsNGB0YIuIik7CtGH0L7QvygyMDI2KTsK0YfQvtC_KDIgKyAzKTsK0YfQvtC_KCIyICsgMyIpOwo)

- The commands run in the order in which they are written.
- Numbers are written without quotes. `чоп(2 + 3)` prints the answer: `5`. But
  `чоп("2 + 3")` prints the text just as it is: `2 + 3`.

## Several values on one line

```som
чоп("Ҷавоб:", 6 * 7);
чоп("Ман", 13, "сола ҳастам");
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YfQvtC_KCLSttCw0LLQvtCxOiIsIDYgKiA3KTsK0YfQvtC_KCLQnNCw0L0iLCAxMywgItGB0L7Qu9CwINKz0LDRgdGC0LDQvCIpOwo)

Values separated by commas are printed on one line, with a space between them:
`Ҷавоб: 42`.

## Common mistakes

- Forgetting to close the quote: `чоп("Салом);`
- Writing `Чоп` or `chop`. Capital and small letters are different: only `чоп`
  works.
- Forgetting to close the bracket: `чоп("Салом";`

If you make a mistake, the playground tells you where it is. In the next lesson,
we will learn to read these messages.

## Tasks

1. [Hello, world!](../tasks/01-salom/README.md) - print your first line.
2. [Three lines](../tasks/01-se-satr/README.md) - print three lines.
3. [A little house](../tasks/01-khona/README.md) - draw a little house with
   symbols.

---

[Contents](README.md) · [Lesson 2 →](02-khato.md)
