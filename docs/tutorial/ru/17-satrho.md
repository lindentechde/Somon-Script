# Урок 17. Строки

**В этом уроке:** вы будете работать с текстом: брать буквы, делать текст
заглавным и строчным, делить его на слова.

## Строка — список букв

Строка похожа на список: у неё есть длина и индексы:

```som
тағ калима = "китоб";
чоп(калима.дарозӣ);
чоп(калима[0]);
чоп(калима[калима.дарозӣ - 1]);
барои (тағ ҳарф аз калима) {
  чоп(ҳарф);
}
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC60LDQu9C40LzQsCA9ICLQutC40YLQvtCxIjsK0YfQvtC_KNC60LDQu9C40LzQsC7QtNCw0YDQvtC306MpOwrRh9C-0L8o0LrQsNC70LjQvNCwWzBdKTsK0YfQvtC_KNC60LDQu9C40LzQsFvQutCw0LvQuNC80LAu0LTQsNGA0L7Qt9OjIC0gMV0pOwrQsdCw0YDQvtC4ICjRgtCw0pMg0rPQsNGA0YQg0LDQtyDQutCw0LvQuNC80LApIHsKICDRh9C-0L8o0rPQsNGA0YQpOwp9Cg)

Букву строки изменить нельзя; нужно построить новую строку.

## Построение строки

```som
тағ ном = хондан();
тағ синну = хонданиРақам();
чоп("Салом, " + ном + "!");
чоп(`${ном} ${синну} сола аст.`);
```

Ввод:

```text
Зарина
13
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC90L7QvCA9INGF0L7QvdC00LDQvSgpOwrRgtCw0pMg0YHQuNC90L3RgyA9INGF0L7QvdC00LDQvdC40KDQsNKb0LDQvCgpOwrRh9C-0L8oItCh0LDQu9C-0LwsICIgKyDQvdC-0LwgKyAiISIpOwrRh9C-0L8oYCR70L3QvtC8fSAke9GB0LjQvdC90YN9INGB0L7Qu9CwINCw0YHRgi5gKTsK&i=0JfQsNGA0LjQvdCwCjEzCg)

В обратных кавычках `` `…` `` (шаблонная строка) значение можно вставить через
`${…}`.

## Методы строк

| Метод           | Смысл                   | Пример                     | Результат            |
| --------------- | ----------------------- | -------------------------- | -------------------- |
| `калон()`       | заглавные буквы         | `"салом".калон()`          | `"САЛОМ"`            |
| `хурд()`        | строчные буквы          | `"САЛОМ".хурд()`           | `"салом"`            |
| `дорад(х)`      | есть ли `х` в строке    | `"Душанбе".дорад("шан")`   | `дуруст`             |
| `тозаКардан()`  | убрать пробелы по краям | `"  ҳа  ".тозаКардан()`    | `"ҳа"`               |
| `ҷудокунӣ(" ")` | разделить на части      | `"ман ту ӯ".ҷудокунӣ(" ")` | `["ман", "ту", "ӯ"]` |
| `такрор(н)`     | повторить `н` раз       | `"ҳа".такрор(3)`           | `"ҳаҳаҳа"`           |

```som
тағ ҷумла = хондан();
тағ калимаҳо = ҷумла.ҷудокунӣ(" ");
чоп("Калимаҳо:", калимаҳо.дарозӣ);
чоп(ҷумла.калон());
```

Ввод:

```text
ман барномасозиро дӯст медорам
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINK30YPQvNC70LAgPSDRhdC-0L3QtNCw0L0oKTsK0YLQsNKTINC60LDQu9C40LzQsNKz0L4gPSDSt9GD0LzQu9CwLtK30YPQtNC-0LrRg9C906MoIiAiKTsK0YfQvtC_KCLQmtCw0LvQuNC80LDSs9C-OiIsINC60LDQu9C40LzQsNKz0L4u0LTQsNGA0L7Qt9OjKTsK0YfQvtC_KNK30YPQvNC70LAu0LrQsNC70L7QvSgpKTsK&i=0LzQsNC9INCx0LDRgNC90L7QvNCw0YHQvtC30LjRgNC-INC006_RgdGCINC80LXQtNC-0YDQsNC8Cg)

## Задачи

1. [Длина имени](../tasks/17-darozii-nom/README.md)
2. [Буква «а»](../tasks/17-harfi-a/README.md)
3. [Палиндром](../tasks/17-palindrom/README.md)
4. [Слова](../tasks/17-kalimaho/README.md)

---

[← Урок 16](16-ruykhatho.md) · [Оглавление](README.md) ·
[Урок 18 →](18-obyekt.md)
