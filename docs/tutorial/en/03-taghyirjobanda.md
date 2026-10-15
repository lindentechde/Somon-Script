# Lesson 3. Variables

**In this lesson:** you will keep values in variables and change them.

## What is a variable?

A variable is a box with a name that holds a value. You create it with the word
`тағ`:

```som
тағ ном = "Зарина";
тағ синну = 13;
чоп(ном);
чоп(синну);
чоп(ном, "-", синну, "сола");
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC90L7QvCA9ICLQl9Cw0YDQuNC90LAiOwrRgtCw0pMg0YHQuNC90L3RgyA9IDEzOwrRh9C-0L8o0L3QvtC8KTsK0YfQvtC_KNGB0LjQvdC90YMpOwrRh9C-0L8o0L3QvtC8LCAiLSIsINGB0LjQvdC90YMsICLRgdC-0LvQsCIpOwo)

<!-- anim: variable-box -->

- `тағ ном = "Зарина";` creates (declares) the variable `ном` ("name") and gives
  it the value `"Зарина"`.
- `чоп(ном)` prints the value of the variable, not the word "ном".

## Changing a value

```som
тағ хол = 10;
чоп(хол);
хол = 15;
чоп(хол);
хол = хол + 5;
чоп(хол);
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGF0L7QuyA9IDEwOwrRh9C-0L8o0YXQvtC7KTsK0YXQvtC7ID0gMTU7CtGH0L7QvyjRhdC-0LspOwrRhdC-0LsgPSDRhdC-0LsgKyA1OwrRh9C-0L8o0YXQvtC7KTsK)

<!-- anim: variable-box {"focus": ["хол"]} -->

- `хол = 15;` gives a new value; you do not need `тағ` any more.
- `хол = хол + 5;` takes the current value, adds 5, and saves the result in
  `хол` again.

<!-- quiz
q: What value is in `х` after this program?
code: |
  тағ х = 4;
  х = х * 2;
  х = х + 1;
options: 4 | 8 | *9 | 5
explain: First `х` is 4, then 4 * 2 = 8, then 8 + 1 = 9.
-->

## Constants

A value that does not change is declared with the word `собит`:

```som
собит рӯзҳоиҲафта = 7;
чоп("Дар як ҳафта", рӯзҳоиҲафта, "рӯз ҳаст");
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YHQvtCx0LjRgiDRgNOv0LfSs9C-0LjSstCw0YTRgtCwID0gNzsK0YfQvtC_KCLQlNCw0YAg0Y_QuiDSs9Cw0YTRgtCwIiwg0YDTr9C30rPQvtC40rLQsNGE0YLQsCwgItGA06_QtyDSs9Cw0YHRgiIpOwo)

If you give a `собит` a new value, the playground shows an error.

## The name of a variable

- A name is made of letters, digits and `_`, and it starts with a letter: `ном`,
  `хол2`, `шумораи_хонандагон`, `рӯзҳоиҲафта`.
- Choose names that are easy to understand: `синну` ("age") is better than `х`.
- Keywords (`тағ`, `агар`, `чоп` …) cannot be used as names.

## Common mistakes

- Using a variable before it is declared: `чоп(х); тағ х = 1;`
- Declaring the same name twice with `тағ`.
- Writing `чоп("ном")` instead of `чоп(ном)`: quotes print the text itself.

## Tasks

1. [My card](../tasks/03-shinosnoma/README.md)
2. [Swap](../tasks/03-ivaz/README.md)
3. [Next year](../tasks/03-soli-oyanda/README.md)

---

[← Lesson 2](02-khato.md) · [Contents](README.md) · [Lesson 4 →](04-raqam.md)
