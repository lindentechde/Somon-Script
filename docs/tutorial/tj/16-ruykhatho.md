# Дарси 16. Кор бо рӯйхатҳо

**Дар ин дарс:** дар рӯйхат ҷустуҷӯ мекунед, онро тартиб медиҳед ва рӯйхати нав
месозед.

## Ҷустуҷӯ

```som
тағ номҳо = ["Алӣ", "Зарина", "Фарҳод"];
чоп(номҳо.дорад("Зарина"));
чоп(номҳо.индекси("Фарҳод"));
чоп(номҳо.индекси("Сино"));
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC90L7QvNKz0L4gPSBbItCQ0LvToyIsICLQl9Cw0YDQuNC90LAiLCAi0KTQsNGA0rPQvtC0Il07CtGH0L7QvyjQvdC-0LzSs9C-LtC00L7RgNCw0LQoItCX0LDRgNC40L3QsCIpKTsK0YfQvtC_KNC90L7QvNKz0L4u0LjQvdC00LXQutGB0LgoItCk0LDRgNKz0L7QtCIpKTsK0YfQvtC_KNC90L7QvNKz0L4u0LjQvdC00LXQutGB0LgoItCh0LjQvdC-IikpOwo)

- `дорад(х)` — оё `х` дар рӯйхат ҳаст: `дуруст` ё `нодуруст`.
- `индекси(х)` — индекси `х`, ё `-1`, агар он набошад.

## Тартиб додан

```som
тағ рақамҳо = [30, 4, 100, 25];
рақамҳо.тартиб((а, б) => а - б);
чоп(рақамҳо);
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGA0LDSm9Cw0LzSs9C-ID0gWzMwLCA0LCAxMDAsIDI1XTsK0YDQsNKb0LDQvNKz0L4u0YLQsNGA0YLQuNCxKCjQsCwg0LEpID0-INCwIC0g0LEpOwrRh9C-0L8o0YDQsNKb0LDQvNKz0L4pOwo)

`тартиб` рақамҳоро аз хурд ба калон тартиб медиҳад, агар ба он `(а, б) => а - б`
диҳед. Ин функсияи кӯтоҳ мегӯяд, ки кадом рақам пеш меравад.

## Рӯйхати нав: `филтр` ва `харита`

```som
тағ холҳо = [55, 92, 47, 78, 30];
тағ гузаштагон = холҳо.филтр(х => х >= 50);
тағ дучанд = холҳо.харита(х => х * 2);
чоп("Гузаштагон:", гузаштагон);
чоп("Дучанд:", дучанд);
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGF0L7Qu9Kz0L4gPSBbNTUsIDkyLCA0NywgNzgsIDMwXTsK0YLQsNKTINCz0YPQt9Cw0YjRgtCw0LPQvtC9ID0g0YXQvtC70rPQvi7RhNC40LvRgtGAKNGFID0-INGFID49IDUwKTsK0YLQsNKTINC00YPRh9Cw0L3QtCA9INGF0L7Qu9Kz0L4u0YXQsNGA0LjRgtCwKNGFID0-INGFICogMik7CtGH0L7Qvygi0JPRg9C30LDRiNGC0LDQs9C-0L06Iiwg0LPRg9C30LDRiNGC0LDQs9C-0L0pOwrRh9C-0L8oItCU0YPRh9Cw0L3QtDoiLCDQtNGD0YfQsNC90LQpOwo)

- `филтр` танҳо унсурҳоеро нигоҳ медорад, ки барои онҳо шарт `дуруст` аст.
- `харита` ҳар унсурро иваз карда, рӯйхати нав месозад.
- `х => х >= 50` — функсияи кӯтоҳ: `х` мегирад ва `х >= 50`-ро бармегардонад.

## Супоришҳо

1. [Аз миёна калонтар](../tasks/16-az-miyona-kalon/README.md)
2. [Тартиб](../tasks/16-tartib/README.md)
3. [Ҷустуҷӯ](../tasks/16-justuju/README.md)
4. [Бе такрор](../tasks/16-be-takror/README.md)

---

[← Дарси 15](15-ruykhat.md) · [Мундариҷа](README.md) ·
[Дарси 17 →](17-satrho.md)
