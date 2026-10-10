# Дарси 8. Шарт: `агар` ва `вагарна`

**Дар ин дарс:** барнома вобаста ба шарт қарор қабул мекунад.

## `агар`

```som
тағ ҳарорат = хонданиРақам();
агар (ҳарорат > 30) {
  чоп("Имрӯз гарм аст!");
}
чоп("Рӯзи хуш!");
```

Вуруд:

```text
35
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINKz0LDRgNC-0YDQsNGCID0g0YXQvtC90LTQsNC90LjQoNCw0pvQsNC8KCk7CtCw0LPQsNGAICjSs9Cw0YDQvtGA0LDRgiA-IDMwKSB7CiAg0YfQvtC_KCLQmNC80YDTr9C3INCz0LDRgNC8INCw0YHRgiEiKTsKfQrRh9C-0L8oItCg06_Qt9C4INGF0YPRiCEiKTsK&i=MzUK)

- Шарт дар қавс `( )` навишта мешавад.
- Фармонҳои дохили `{ }` танҳо вақте иҷро мешаванд, ки шарт `дуруст` бошад.
- `чоп("Рӯзи хуш!")` берун аз `{ }` аст — он ҳамеша иҷро мешавад.

Вурудро ба `20` иваз кунед ва боз иҷро кунед.

## `вагарна`

`вагарна` мегӯяд, ки агар шарт нодуруст бошад, чӣ кор кардан лозим аст:

```som
тағ рақам = хонданиРақам();
агар (рақам % 2 === 0) {
  чоп(рақам, "ҷуфт аст");
} вагарна {
  чоп(рақам, "тоқ аст");
}
```

Вуруд:

```text
7
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINGA0LDSm9Cw0LwgPSDRhdC-0L3QtNCw0L3QuNCg0LDSm9Cw0LwoKTsK0LDQs9Cw0YAgKNGA0LDSm9Cw0LwgJSAyID09PSAwKSB7CiAg0YfQvtC_KNGA0LDSm9Cw0LwsICLSt9GD0YTRgiDQsNGB0YIiKTsKfSDQstCw0LPQsNGA0L3QsCB7CiAg0YfQvtC_KNGA0LDSm9Cw0LwsICLRgtC-0psg0LDRgdGCIik7Cn0K&i=Nwo)

Аз ду қисм ҳамеша танҳо яктояш иҷро мешавад.

## Калонтарин аз ду рақам

```som
тағ а = хонданиРақам();
тағ б = хонданиРақам();
агар (а > б) {
  чоп(а);
} вагарна {
  чоп(б);
}
```

Вуруд:

```text
4
9
```

[▶ Дар майдони озмоиш иҷро кунед](https://lindentechde.github.io/Somon-Script/#c=0YLQsNKTINCwID0g0YXQvtC90LTQsNC90LjQoNCw0pvQsNC8KCk7CtGC0LDSkyDQsSA9INGF0L7QvdC00LDQvdC40KDQsNKb0LDQvCgpOwrQsNCz0LDRgCAo0LAgPiDQsSkgewogINGH0L7QvyjQsCk7Cn0g0LLQsNCz0LDRgNC90LAgewogINGH0L7QvyjQsSk7Cn0K&i=NAo5Cg)

## Тартиби навиштан

Фармонҳои дохили `{ }`-ро бо ду фосила аз чап менависанд. Ин барои компютер фарқ
надорад, вале барномаро барои одам хонотар мекунад. Дар майдони озмоиш пас аз
`{` ва Enter фосилаҳо худ гузошта мешаванд.

## Хатоҳои маъмул

- `агар (х = 5)` — `=` ба ҷои `===`.
- `;` пас аз шарт: `агар (х > 5); { … }` — он гоҳ `{ }` ҳамеша иҷро мешавад.
- Қавси `}`-ро фаромӯш кардан. Майдони озмоиш мегӯяд, ки қавс дар кадом сатр
  кушода шуда буд.

## Супоришҳо

1. [Ҷуфт ё тоқ](../tasks/08-juft-yo-toq/README.md)
2. [Калонтарин](../tasks/08-kalontarin/README.md)
3. [Имтиҳон](../tasks/08-imtihon/README.md)
4. [Мутлақ](../tasks/08-mutlaq/README.md)

---

[← Дарси 7](07-muqoisa.md) · [Мундариҷа](README.md) · [Дарси 9 →](09-shartho.md)
