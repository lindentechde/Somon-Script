# Дарси 17. Сатрҳо

**Дар ин дарс:** бо матн кор мекунед: ҳарфҳоро мегиред, матнро калон ва хурд
мекунед ва онро ба калимаҳо ҷудо мекунед.

## Сатр — рӯйхати ҳарфҳо

Сатр мисли рӯйхат аст: дарозӣ ва индекс дорад:

```som
тағ калима = "китоб";
чоп(калима.дарозӣ);
чоп(калима[0]);
чоп(калима[калима.дарозӣ - 1]);
барои (тағ ҳарф аз калима) {
  чоп(ҳарф);
}
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC60LDQu9C40LzQsCA9ICLQutC40YLQvtCxIjsK0YfQvtC_KNC60LDQu9C40LzQsC7QtNCw0YDQvtC306MpOwrRh9C-0L8o0LrQsNC70LjQvNCwWzBdKTsK0YfQvtC_KNC60LDQu9C40LzQsFvQutCw0LvQuNC80LAu0LTQsNGA0L7Qt9OjIC0gMV0pOwrQsdCw0YDQvtC4ICjRgtCw0pMg0rPQsNGA0YQg0LDQtyDQutCw0LvQuNC80LApIHsKICDRh9C-0L8o0rPQsNGA0YQpOwp9Cg)

Ҳарфи сатрро иваз кардан мумкин нест; сатри нав сохтан лозим аст.

## Сатр сохтан

```som
тағ ном = хондан();
тағ синну = хонданиРақам();
чоп("Салом, " + ном + "!");
чоп(`${ном} ${синну} сола аст.`);
```

Вуруд:

```text
Зарина
13
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC90L7QvCA9INGF0L7QvdC00LDQvSgpOwrRgtCw0pMg0YHQuNC90L3RgyA9INGF0L7QvdC00LDQvdC40KDQsNKb0LDQvCgpOwrRh9C-0L8oItCh0LDQu9C-0LwsICIgKyDQvdC-0LwgKyAiISIpOwrRh9C-0L8oYCR70L3QvtC8fSAke9GB0LjQvdC90YN9INGB0L7Qu9CwINCw0YHRgi5gKTsK&i=0JfQsNGA0LjQvdCwCjEzCg)

Дар нохунаки каҷ `` `…` `` (қолаби матнӣ) қиматро бо `${…}` дохил кардан мумкин
аст.

## Усулҳои сатр

| Усул            | Маъно                          | Мисол                      | Натиҷа               |
| --------------- | ------------------------------ | -------------------------- | -------------------- |
| `калон()`       | ҳарфҳои калон                  | `"салом".калон()`          | `"САЛОМ"`            |
| `хурд()`        | ҳарфҳои хурд                   | `"САЛОМ".хурд()`           | `"салом"`            |
| `дорад(х)`      | оё `х` дар сатр ҳаст           | `"Душанбе".дорад("шан")`   | `дуруст`             |
| `тозаКардан()`  | фосилаҳои аввал ва охирро тоза | `"  ҳа  ".тозаКардан()`    | `"ҳа"`               |
| `ҷудокунӣ(" ")` | ба қисмҳо ҷудо мекунад         | `"ман ту ӯ".ҷудокунӣ(" ")` | `["ман", "ту", "ӯ"]` |
| `такрор(н)`     | `н` бор такрор                 | `"ҳа".такрор(3)`           | `"ҳаҳаҳа"`           |

```som
тағ ҷумла = хондан();
тағ калимаҳо = ҷумла.ҷудокунӣ(" ");
чоп("Калимаҳо:", калимаҳо.дарозӣ);
чоп(ҷумла.калон());
```

Вуруд:

```text
ман барномасозиро дӯст медорам
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINK30YPQvNC70LAgPSDRhdC-0L3QtNCw0L0oKTsK0YLQsNKTINC60LDQu9C40LzQsNKz0L4gPSDSt9GD0LzQu9CwLtK30YPQtNC-0LrRg9C906MoIiAiKTsK0YfQvtC_KCLQmtCw0LvQuNC80LDSs9C-OiIsINC60LDQu9C40LzQsNKz0L4u0LTQsNGA0L7Qt9OjKTsK0YfQvtC_KNK30YPQvNC70LAu0LrQsNC70L7QvSgpKTsK&i=0LzQsNC9INCx0LDRgNC90L7QvNCw0YHQvtC30LjRgNC-INC006_RgdGCINC80LXQtNC-0YDQsNC8Cg)

## Супоришҳо

1. [Дарозии ном](../tasks/17-darozii-nom/README.md)
2. [Ҳарфи «а»](../tasks/17-harfi-a/README.md)
3. [Палиндром](../tasks/17-palindrom/README.md)
4. [Калимаҳо](../tasks/17-kalimaho/README.md)

---

[← Дарси 16](16-ruykhatho.md) · [Мундариҷа](README.md) ·
[Дарси 18 →](18-obyekt.md)
