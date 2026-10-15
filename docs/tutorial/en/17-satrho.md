# Lesson 17. Strings

**In this lesson:** you will work with text: take letters, change text to
capital or small letters, and split it into words.

## A string is a list of letters

A string is like a list: it has a length and indexes:

```som
тағ калима = "китоб";
чоп(калима.дарозӣ);
чоп(калима[0]);
чоп(калима[калима.дарозӣ - 1]);
барои (тағ ҳарф аз калима) {
  чоп(ҳарф);
}
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC60LDQu9C40LzQsCA9ICLQutC40YLQvtCxIjsK0YfQvtC_KNC60LDQu9C40LzQsC7QtNCw0YDQvtC306MpOwrRh9C-0L8o0LrQsNC70LjQvNCwWzBdKTsK0YfQvtC_KNC60LDQu9C40LzQsFvQutCw0LvQuNC80LAu0LTQsNGA0L7Qt9OjIC0gMV0pOwrQsdCw0YDQvtC4ICjRgtCw0pMg0rPQsNGA0YQg0LDQtyDQutCw0LvQuNC80LApIHsKICDRh9C-0L8o0rPQsNGA0YQpOwp9Cg)

You cannot change a letter of a string; you have to build a new string.

## Building a string

```som
тағ ном = хондан();
тағ синну = хонданиРақам();
чоп("Салом, " + ном + "!");
чоп(`${ном} ${синну} сола аст.`);
```

Input:

```text
Зарина
13
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC90L7QvCA9INGF0L7QvdC00LDQvSgpOwrRgtCw0pMg0YHQuNC90L3RgyA9INGF0L7QvdC00LDQvdC40KDQsNKb0LDQvCgpOwrRh9C-0L8oItCh0LDQu9C-0LwsICIgKyDQvdC-0LwgKyAiISIpOwrRh9C-0L8oYCR70L3QvtC8fSAke9GB0LjQvdC90YN9INGB0L7Qu9CwINCw0YHRgi5gKTsK&i=0JfQsNGA0LjQvdCwCjEzCg)

Between backticks `` `…` `` (a template string), you can put a value into the
text with `${…}`.

## String methods

| Method          | Meaning                    | Example                    | Result               |
| --------------- | -------------------------- | -------------------------- | -------------------- |
| `калон()`       | capital letters            | `"салом".калон()`          | `"САЛОМ"`            |
| `хурд()`        | small letters              | `"САЛОМ".хурд()`           | `"салом"`            |
| `дорад(х)`      | is `х` in the string?      | `"Душанбе".дорад("шан")`   | `дуруст`             |
| `тозаКардан()`  | remove spaces at the edges | `"  ҳа  ".тозаКардан()`    | `"ҳа"`               |
| `ҷудокунӣ(" ")` | split into parts           | `"ман ту ӯ".ҷудокунӣ(" ")` | `["ман", "ту", "ӯ"]` |
| `такрор(н)`     | repeat `н` times           | `"ҳа".такрор(3)`           | `"ҳаҳаҳа"`           |

```som
тағ ҷумла = хондан();
тағ калимаҳо = ҷумла.ҷудокунӣ(" ");
чоп("Калимаҳо:", калимаҳо.дарозӣ);
чоп(ҷумла.калон());
```

Input:

```text
ман барномасозиро дӯст медорам
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINK30YPQvNC70LAgPSDRhdC-0L3QtNCw0L0oKTsK0YLQsNKTINC60LDQu9C40LzQsNKz0L4gPSDSt9GD0LzQu9CwLtK30YPQtNC-0LrRg9C906MoIiAiKTsK0YfQvtC_KCLQmtCw0LvQuNC80LDSs9C-OiIsINC60LDQu9C40LzQsNKz0L4u0LTQsNGA0L7Qt9OjKTsK0YfQvtC_KNK30YPQvNC70LAu0LrQsNC70L7QvSgpKTsK&i=0LzQsNC9INCx0LDRgNC90L7QvNCw0YHQvtC30LjRgNC-INC006_RgdGCINC80LXQtNC-0YDQsNC8Cg)

## Tasks

1. [Length of a name](../tasks/17-darozii-nom/README.md)
2. [The letter "а"](../tasks/17-harfi-a/README.md)
3. [Palindrome](../tasks/17-palindrom/README.md)
4. [Words](../tasks/17-kalimaho/README.md)

---

[← Lesson 16](16-ruykhatho.md) · [Contents](README.md) ·
[Lesson 18 →](18-obyekt.md)
