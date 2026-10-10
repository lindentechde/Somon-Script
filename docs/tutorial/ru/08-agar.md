# Урок 8. Условие: `агар` и `вагарна`

**В этом уроке:** программа принимает решение в зависимости от условия.

## `агар`

`агар` значит «если»:

```som
тағ ҳарорат = хонданиРақам();
агар (ҳарорат > 30) {
  чоп("Имрӯз гарм аст!");
}
чоп("Рӯзи хуш!");
```

Ввод:

```text
35
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINKz0LDRgNC-0YDQsNGCID0g0YXQvtC90LTQsNC90LjQoNCw0pvQsNC8KCk7CtCw0LPQsNGAICjSs9Cw0YDQvtGA0LDRgiA-IDMwKSB7CiAg0YfQvtC_KCLQmNC80YDTr9C3INCz0LDRgNC8INCw0YHRgiEiKTsKfQrRh9C-0L8oItCg06_Qt9C4INGF0YPRiCEiKTsK&i=MzUK)

- Условие пишется в скобках `( )`.
- Команды внутри `{ }` выполняются, только если условие `дуруст`.
- `чоп("Рӯзи хуш!")` стоит вне `{ }` — она выполняется всегда.

Замените ввод на `20` и запустите снова.

## `вагарна`

`вагарна` значит «иначе» — что делать, если условие ложно:

```som
тағ рақам = хонданиРақам();
агар (рақам % 2 === 0) {
  чоп(рақам, "ҷуфт аст");
} вагарна {
  чоп(рақам, "тоқ аст");
}
```

Ввод:

```text
7
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGA0LDSm9Cw0LwgPSDRhdC-0L3QtNCw0L3QuNCg0LDSm9Cw0LwoKTsK0LDQs9Cw0YAgKNGA0LDSm9Cw0LwgJSAyID09PSAwKSB7CiAg0YfQvtC_KNGA0LDSm9Cw0LwsICLSt9GD0YTRgiDQsNGB0YIiKTsKfSDQstCw0LPQsNGA0L3QsCB7CiAg0YfQvtC_KNGA0LDSm9Cw0LwsICLRgtC-0psg0LDRgdGCIik7Cn0K&i=Nwo)

Из двух частей всегда выполняется только одна.

## Большее из двух чисел

```som
тағ а = хонданиРақам();
тағ б = хонданиРақам();
агар (а > б) {
  чоп(а);
} вагарна {
  чоп(б);
}
```

Ввод:

```text
4
9
```

[▶ Запустить в песочнице](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINCwID0g0YXQvtC90LTQsNC90LjQoNCw0pvQsNC8KCk7CtGC0LDSkyDQsSA9INGF0L7QvdC00LDQvdC40KDQsNKb0LDQvCgpOwrQsNCz0LDRgCAo0LAgPiDQsSkgewogINGH0L7QvyjQsCk7Cn0g0LLQsNCz0LDRgNC90LAgewogINGH0L7QvyjQsSk7Cn0K&i=NAo5Cg)

## Оформление

Команды внутри `{ }` пишут с отступом в два пробела. Компьютеру всё равно, но
человеку так легче читать. В песочнице после `{` и Enter отступ ставится сам.

## Частые ошибки

- `агар (х = 5)` — `=` вместо `===`.
- `;` после условия: `агар (х > 5); { … }` — тогда `{ }` выполняется всегда.
- Забыть `}`. Песочница скажет, в какой строке скобка была открыта.

## Задачи

1. [Чётное или нечётное](../tasks/08-juft-yo-toq/README.md)
2. [Наибольшее](../tasks/08-kalontarin/README.md)
3. [Экзамен](../tasks/08-imtihon/README.md)
4. [Модуль числа](../tasks/08-mutlaq/README.md)

---

[← Урок 7](07-muqoisa.md) · [Оглавление](README.md) · [Урок 9 →](09-shartho.md)
