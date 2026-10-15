# Lesson 16. Working with lists

**In this lesson:** you will search in a list, sort it and build new lists.

## Searching

```som
тағ номҳо = ["Алӣ", "Зарина", "Фарҳод"];
чоп(номҳо.дорад("Зарина"));
чоп(номҳо.индекси("Фарҳод"));
чоп(номҳо.индекси("Сино"));
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINC90L7QvNKz0L4gPSBbItCQ0LvToyIsICLQl9Cw0YDQuNC90LAiLCAi0KTQsNGA0rPQvtC0Il07CtGH0L7QvyjQvdC-0LzSs9C-LtC00L7RgNCw0LQoItCX0LDRgNC40L3QsCIpKTsK0YfQvtC_KNC90L7QvNKz0L4u0LjQvdC00LXQutGB0LgoItCk0LDRgNKz0L7QtCIpKTsK0YfQvtC_KNC90L7QvNKz0L4u0LjQvdC00LXQutGB0LgoItCh0LjQvdC-IikpOwo)

- `дорад(х)` ("contains") tells whether `х` is in the list: `дуруст` or
  `нодуруст`.
- `индекси(х)` gives the index of `х`, or `-1` if it is not there.

## Sorting

```som
тағ рақамҳо = [30, 4, 100, 25];
рақамҳо.тартиб((а, б) => а - б);
чоп(рақамҳо);
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGA0LDSm9Cw0LzSs9C-ID0gWzMwLCA0LCAxMDAsIDI1XTsK0YDQsNKb0LDQvNKz0L4u0YLQsNGA0YLQuNCxKCjQsCwg0LEpID0-INCwIC0g0LEpOwrRh9C-0L8o0YDQsNKb0LDQvNKz0L4pOwo)

`тартиб` ("order") puts the numbers in order from the smallest to the largest if
you give it `(а, б) => а - б`. This short function says which number comes
first.

## A new list: `филтр` and `харита`

```som
тағ холҳо = [55, 92, 47, 78, 30];
тағ гузаштагон = холҳо.филтр(х => х >= 50);
тағ дучанд = холҳо.харита(х => х * 2);
чоп("Гузаштагон:", гузаштагон);
чоп("Дучанд:", дучанд);
```

[▶ Run in the playground](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGF0L7Qu9Kz0L4gPSBbNTUsIDkyLCA0NywgNzgsIDMwXTsK0YLQsNKTINCz0YPQt9Cw0YjRgtCw0LPQvtC9ID0g0YXQvtC70rPQvi7RhNC40LvRgtGAKNGFID0-INGFID49IDUwKTsK0YLQsNKTINC00YPRh9Cw0L3QtCA9INGF0L7Qu9Kz0L4u0YXQsNGA0LjRgtCwKNGFID0-INGFICogMik7CtGH0L7Qvygi0JPRg9C30LDRiNGC0LDQs9C-0L06Iiwg0LPRg9C30LDRiNGC0LDQs9C-0L0pOwrRh9C-0L8oItCU0YPRh9Cw0L3QtDoiLCDQtNGD0YfQsNC90LQpOwo)

- `филтр` keeps only the elements for which the condition is `дуруст`.
- `харита` builds a new list from the function's result for each element;
  `холҳо` itself does not change.
- `х => х >= 50` is a short function: it takes `х` and returns `х >= 50`.

## Tasks

1. [Above the average](../tasks/16-az-miyona-kalon/README.md)
2. [Sorting](../tasks/16-tartib/README.md)
3. [Search](../tasks/16-justuju/README.md)
4. [No repeats](../tasks/16-be-takror/README.md)

---

[← Lesson 15](15-ruykhat.md) · [Contents](README.md) ·
[Lesson 17 →](17-satrho.md)
