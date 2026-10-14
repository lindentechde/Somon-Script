# Урок 16. Работа со списками

**В этом уроке:** вы будете искать в списке, сортировать его и строить новые
списки.

## Поиск

```som
тағ номҳо = ["Алӣ", "Зарина", "Фарҳод"];
чоп(номҳо.дорад("Зарина"));
чоп(номҳо.индекси("Фарҳод"));
чоп(номҳо.индекси("Сино"));
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC90L7QvNKz0L4gPSBbItCQ0LvToyIsICLQl9Cw0YDQuNC90LAiLCAi0KTQsNGA0rPQvtC0Il07CtGH0L7QvyjQvdC-0LzSs9C-LtC00L7RgNCw0LQoItCX0LDRgNC40L3QsCIpKTsK0YfQvtC_KNC90L7QvNKz0L4u0LjQvdC00LXQutGB0LgoItCk0LDRgNKz0L7QtCIpKTsK0YfQvtC_KNC90L7QvNKz0L4u0LjQvdC00LXQutGB0LgoItCh0LjQvdC-IikpOwo)

- `дорад(х)` («содержит») — есть ли `х` в списке: `дуруст` или `нодуруст`.
- `индекси(х)` — индекс `х` или `-1`, если его нет.

## Сортировка

```som
тағ рақамҳо = [30, 4, 100, 25];
рақамҳо.тартиб((а, б) => а - б);
чоп(рақамҳо);
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGA0LDSm9Cw0LzSs9C-ID0gWzMwLCA0LCAxMDAsIDI1XTsK0YDQsNKb0LDQvNKz0L4u0YLQsNGA0YLQuNCxKCjQsCwg0LEpID0-INCwIC0g0LEpOwrRh9C-0L8o0YDQsNKb0LDQvNKz0L4pOwo)

`тартиб` («порядок») упорядочивает числа по возрастанию, если передать ему
`(а, б) => а - б`. Эта короткая функция говорит, какое число идёт раньше.

## Новый список: `филтр` и `харита`

```som
тағ холҳо = [55, 92, 47, 78, 30];
тағ гузаштагон = холҳо.филтр(х => х >= 50);
тағ дучанд = холҳо.харита(х => х * 2);
чоп("Гузаштагон:", гузаштагон);
чоп("Дучанд:", дучанд);
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGF0L7Qu9Kz0L4gPSBbNTUsIDkyLCA0NywgNzgsIDMwXTsK0YLQsNKTINCz0YPQt9Cw0YjRgtCw0LPQvtC9ID0g0YXQvtC70rPQvi7RhNC40LvRgtGAKNGFID0-INGFID49IDUwKTsK0YLQsNKTINC00YPRh9Cw0L3QtCA9INGF0L7Qu9Kz0L4u0YXQsNGA0LjRgtCwKNGFID0-INGFICogMik7CtGH0L7Qvygi0JPRg9C30LDRiNGC0LDQs9C-0L06Iiwg0LPRg9C30LDRiNGC0LDQs9C-0L0pOwrRh9C-0L8oItCU0YPRh9Cw0L3QtDoiLCDQtNGD0YfQsNC90LQpOwo)

- `филтр` оставляет только элементы, для которых условие `дуруст`.
- `харита` заменяет каждый элемент и строит новый список.
- `х => х >= 50` — короткая функция: принимает `х` и возвращает `х >= 50`.

## Задачи

1. [Больше среднего](../tasks/16-az-miyona-kalon/README.md)
2. [Сортировка](../tasks/16-tartib/README.md)
3. [Поиск](../tasks/16-justuju/README.md)
4. [Без повторов](../tasks/16-be-takror/README.md)

---

[← Урок 15](15-ruykhat.md) · [Оглавление](README.md) · [Урок 17 →](17-satrho.md)
