# Lesson 5. Input: `хондан` and `хонданиРақам`

**In this lesson:** the program gets data from the user.

## `хондан()`

`хондан()` ("read") reads one line from the "Вуруд" ("input") box:

```som
тағ ном = хондан();
чоп("Салом, " + ном + "!");
```

Input:

```text
Алӣ
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC90L7QvCA9INGF0L7QvdC00LDQvSgpOwrRh9C-0L8oItCh0LDQu9C-0LwsICIgKyDQvdC-0LwgKyAiISIpOwo&i=0JDQu9OjCg)

- In the playground, you type the input in the **"Вуруд"** box: each line is one
  input.
- Each call of `хондан()` takes the next line.

## `хонданиРақам()`

`хондан()` always gives back a **string**. To do math, you need `хонданиРақам()`
("read a number"):

```som
тағ а = хонданиРақам();
тағ б = хонданиРақам();
чоп("Ҷамъ:", а + б);
```

Input:

```text
2
3
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINCwID0g0YXQvtC90LTQsNC90LjQoNCw0pvQsNC8KCk7CtGC0LDSkyDQsSA9INGF0L7QvdC00LDQvdC40KDQsNKb0LDQvCgpOwrRh9C-0L8oItK20LDQvNGKOiIsINCwICsg0LEpOwo&i=MgozCg)

If you write `хондан()` instead of `хонданиРақам()`, you get `23`, not `5`: the
two strings are joined (remember lesson 4).

If the input is not a number, the program stops with an error: "`се` рақам нест:
`хонданиРақам()` рақам интизор буд" ("`се` is not a number"). A decimal number
can be typed with a dot or a comma: `2.5` or `2,5`.

## A question

You can give `хондан` and `хонданиРақам` a question. It is printed before the
program reads the input:

```som
тағ синну = хонданиРақам("Шумо чандсолаед? ");
чоп("Пас аз 5 сол шумо", синну + 5, "сола мешавед.");
```

Input:

```text
13
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGB0LjQvdC90YMgPSDRhdC-0L3QtNCw0L3QuNCg0LDSm9Cw0LwoItCo0YPQvNC-INGH0LDQvdC00YHQvtC70LDQtdC0PyAiKTsK0YfQvtC_KCLQn9Cw0YEg0LDQtyA1INGB0L7QuyDRiNGD0LzQviIsINGB0LjQvdC90YMgKyA1LCAi0YHQvtC70LAg0LzQtdGI0LDQstC10LQuIik7Cg&i=MTMK)

**Do not write a question in the tasks:** the check compares only the output.

## When the input runs out

If the program reads more lines than there are in "Вуруд", there will be an
error: "Вуруд тамом шуд" ("the input has ended"). Give the program as many lines
as it reads.

## Tasks

1. [Hello, name](../tasks/05-salom-nom/README.md)
2. [Sum](../tasks/05-jam/README.md)
3. [Square](../tasks/05-kvadrat/README.md)
4. [Age](../tasks/05-sinnu/README.md)

---

[← Lesson 4](04-raqam.md) · [Contents](README.md) · [Lesson 6 →](06-hisob.md)
