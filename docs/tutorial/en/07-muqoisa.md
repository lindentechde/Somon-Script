# Lesson 7. Comparison: `дуруст` and `нодуруст`

**In this lesson:** you will compare values and meet logical values.

## Logical values

The answer to the question "is it true that ...?" is `дуруст` (yes, true) or
`нодуруст` (no, false). These values are called **logical** (`мантиқӣ`):

```som
чоп(5 > 3);
чоп(2 > 7);
тағ офтобӣ = дуруст;
чоп("Имрӯз офтобӣ:", офтобӣ);
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YfQvtC_KDUgPiAzKTsK0YfQvtC_KDIgPiA3KTsK0YLQsNKTINC-0YTRgtC-0LHToyA9INC00YPRgNGD0YHRgjsK0YfQvtC_KCLQmNC80YDTr9C3INC-0YTRgtC-0LHTozoiLCDQvtGE0YLQvtCx06MpOwo)

## Comparison signs

| Sign  | Meaning                  | Example       | Result     |
| ----- | ------------------------ | ------------- | ---------- |
| `>`   | greater than             | `5 > 3`       | `дуруст`   |
| `<`   | less than                | `5 < 3`       | `нодуруст` |
| `>=`  | greater than or equal to | `5 >= 5`      | `дуруст`   |
| `<=`  | less than or equal to    | `4 <= 3`      | `нодуруст` |
| `===` | equal to                 | `2 + 2 === 4` | `дуруст`   |
| `!==` | not equal to             | `3 !== 3`     | `нодуруст` |

```som
тағ рақам = хонданиРақам();
чоп("Мусбат:", рақам > 0);
чоп("Ҷуфт:", рақам % 2 === 0);
чоп("Даҳ:", рақам === 10);
```

Input:

```text
10
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGA0LDSm9Cw0LwgPSDRhdC-0L3QtNCw0L3QuNCg0LDSm9Cw0LwoKTsK0YfQvtC_KCLQnNGD0YHQsdCw0YI6Iiwg0YDQsNKb0LDQvCA-IDApOwrRh9C-0L8oItK20YPRhNGCOiIsINGA0LDSm9Cw0LwgJSAyID09PSAwKTsK0YfQvtC_KCLQlNCw0rM6Iiwg0YDQsNKb0LDQvCA9PT0gMTApOwo&i=MTAK)

## `=` and `===`

- `=` is **assignment**: `тағ х = 5;` gives `х` the value 5.
- `===` is **comparison**: `х === 5` asks "is `х` equal to five?".

Do not mix up these two signs. If you write `=` in a condition, the playground
will warn you.

## Comparing strings

```som
тағ ҷавоб = хондан();
чоп(ҷавоб === "Душанбе");
```

Input:

```text
Душанбе
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINK30LDQstC-0LEgPSDRhdC-0L3QtNCw0L0oKTsK0YfQvtC_KNK30LDQstC-0LEgPT09ICLQlNGD0YjQsNC90LHQtSIpOwo&i=0JTRg9GI0LDQvdCx0LUK)

Two strings are equal only if all their letters are the same: `"душанбе"` is not
equal to `"Душанбе"`.

## Tasks

1. [Greater?](../tasks/07-kalontar/README.md)
2. [Even?](../tasks/07-juft/README.md)
3. [Password](../tasks/07-ramz/README.md)

---

[← Lesson 6](06-hisob.md) · [Contents](README.md) · [Lesson 8 →](08-agar.md)
