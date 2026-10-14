# Урок 15. Списки

**В этом уроке:** вы будете хранить несколько значений в одном списке.

## Что такое список?

Список (`рӯйхат`) хранит несколько значений по порядку. Его пишут в квадратных
скобках `[ ]`:

```som
тағ холҳо = [5, 4, 5, 3];
чоп(холҳо);
чоп("Аввалин:", холҳо[0]);
чоп("Дуюмин:", холҳо[1]);
чоп("Шумора:", холҳо.дарозӣ);
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGF0L7Qu9Kz0L4gPSBbNSwgNCwgNSwgM107CtGH0L7QvyjRhdC-0LvSs9C-KTsK0YfQvtC_KCLQkNCy0LLQsNC70LjQvToiLCDRhdC-0LvSs9C-WzBdKTsK0YfQvtC_KCLQlNGD0Y7QvNC40L06Iiwg0YXQvtC70rPQvlsxXSk7CtGH0L7Qvygi0KjRg9C80L7RgNCwOiIsINGF0L7Qu9Kz0L4u0LTQsNGA0L7Qt9OjKTsK)

- Каждое значение в списке — **элемент** (`унсур`). Номер элемента — **индекс**
  — начинается с `0`: первый элемент — `холҳо[0]`.
- `холҳо.дарозӣ` («длина») — количество элементов. Последний элемент:
  `холҳо[холҳо.дарозӣ - 1]`.

## Изменить и добавить

```som
тағ меваҳо = ["себ", "нок"];
меваҳо[0] = "анор";
меваҳо.илова("ангур");
чоп(меваҳо);
чоп(меваҳо.дарозӣ);
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC80LXQstCw0rPQviA9IFsi0YHQtdCxIiwgItC90L7QuiJdOwrQvNC10LLQsNKz0L5bMF0gPSAi0LDQvdC-0YAiOwrQvNC10LLQsNKz0L4u0LjQu9C-0LLQsCgi0LDQvdCz0YPRgCIpOwrRh9C-0L8o0LzQtdCy0LDSs9C-KTsK0YfQvtC_KNC80LXQstCw0rPQvi7QtNCw0YDQvtC306MpOwo)

`илова` («добавить») добавляет элемент в конец списка.

## Цикл по списку

`барои (тағ х аз рӯйхат)` берёт элементы по одному:

```som
тағ холҳо = [5, 4, 5, 3, 4];
тағ ҷамъ = 0;
барои (тағ хол аз холҳо) {
  ҷамъ += хол;
}
чоп("Миёна:", ҷамъ / холҳо.дарозӣ);
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGF0L7Qu9Kz0L4gPSBbNSwgNCwgNSwgMywgNF07CtGC0LDSkyDSt9Cw0LzRiiA9IDA7CtCx0LDRgNC-0LggKNGC0LDSkyDRhdC-0Lsg0LDQtyDRhdC-0LvSs9C-KSB7CiAg0rfQsNC80YogKz0g0YXQvtC7Owp9CtGH0L7Qvygi0JzQuNGR0L3QsDoiLCDSt9Cw0LzRiiAvINGF0L7Qu9Kz0L4u0LTQsNGA0L7Qt9OjKTsK)

## Заполнить список из ввода

Сначала количество элементов, потом сами элементы, каждый в отдельной строке:

```som
тағ н = хонданиРақам();
тағ рақамҳо = [];
барои (тағ и = 0; и < н; и++) {
  рақамҳо.илова(хонданиРақам());
}
чоп(рақамҳо);
```

Ввод:

```text
3
10
20
30
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC9ID0g0YXQvtC90LTQsNC90LjQoNCw0pvQsNC8KCk7CtGC0LDSkyDRgNCw0pvQsNC80rPQviA9IFtdOwrQsdCw0YDQvtC4ICjRgtCw0pMg0LggPSAwOyDQuCA8INC9OyDQuCsrKSB7CiAg0YDQsNKb0LDQvNKz0L4u0LjQu9C-0LLQsCjRhdC-0L3QtNCw0L3QuNCg0LDSm9Cw0LwoKSk7Cn0K0YfQvtC_KNGA0LDSm9Cw0LzSs9C-KTsK&i=MwoxMAoyMAozMAo)

## Частые ошибки

- Индекс начинается не с `1`, а с `0`.
- Элемент за пределами списка: `холҳо[10]` даёт `беқимат` (нет значения), а
  `холҳо[10].дарозӣ` — ошибку выполнения.

## Задачи

1. [Сумма списка](../tasks/15-jami-ruykhat/README.md)
2. [Наибольшее в списке](../tasks/15-kalontarin/README.md)
3. [Наоборот](../tasks/15-baraks/README.md)
4. [Количество чётных](../tasks/15-shumorai-juftho/README.md)

---

[← Урок 14](14-bozgasht.md) · [Оглавление](README.md) ·
[Урок 16 →](16-ruykhatho.md)
